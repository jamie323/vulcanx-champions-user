// ─── VulcanX Champions · Wallet Manager ───────────────────────────
// Ported from Vulcan Runner's src/wallet.js — same dual-provider
// strategy (window.ethereum OR WalletConnect v2) and the same mobile /
// revoke / session hardening. Trimmed to the Champions feature set:
// no PYR balance, no TournamentPool — only connect + chain-switch +
// personalSign + sendDummyTx.
//
// Loads WalletConnect EthereumProvider from CDN (UMD build) so we stay
// a zero-bundler static HTML deploy.
//
// Exposes window.vxWallet (instance) + window.VXWalletManager (class)
// Events emitted: connected, disconnected, accountChanged, chainChanged,
//                 chainStatus, error.

(function () {
  'use strict';

  // ─── Config ──────────────────────────────────────────────────────
  // Reuse Runner's WalletConnect project ID — same Vulcan Forged
  // organization so both apps share the relay pairing allowlist.
  const WC_PROJECT_ID = (typeof window !== 'undefined' && window.__WC_PROJECT_ID__)
    || '830a5fd6ce315be2160f0e737f651138';

  // Elysium chain (chainId 1339) — Champions' home.
  const ELYSIUM_CHAIN_ID     = '0x53b';
  const ELYSIUM_CHAIN_ID_DEC = 1339;
  const ELYSIUM_RPC          = 'https://rpc.elysiumchain.tech/';
  const ELYSIUM_EXPLORER     = 'https://blockscout.elysiumchain.tech';
  const ELYSIUM_CHAIN_PARAMS = {
    chainId: ELYSIUM_CHAIN_ID,
    chainName: 'Elysium',
    nativeCurrency: { name: 'PYR', symbol: 'PYR', decimals: 18 },
    rpcUrls: [ELYSIUM_RPC],
    blockExplorerUrls: [ELYSIUM_EXPLORER + '/'],
  };

  // Session persistence — sessionStorage (NOT localStorage) so a browser
  // close forces re-connect but a refresh doesn't. Matches Runner.
  const SESSION_KEY = 'vx_wallet_session_v1';
  const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      .test(navigator.userAgent);
  }

  // ─── Lazy-load the WalletConnect UMD bundle ──────────────────────
  // We don't want to block the page with the ~400KB bundle if the user
  // has window.ethereum and will never need WC. Load on demand.
  let _wcLoadPromise = null;
  function loadWalletConnectScript() {
    if (_wcLoadPromise) return _wcLoadPromise;
    if (window['@walletconnect/ethereum-provider']?.EthereumProvider) {
      _wcLoadPromise = Promise.resolve(window['@walletconnect/ethereum-provider'].EthereumProvider);
      return _wcLoadPromise;
    }
    _wcLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2.23.9/dist/index.umd.js';
      s.async = true;
      s.onload = () => {
        const ns = window['@walletconnect/ethereum-provider'];
        if (!ns || !ns.EthereumProvider) {
          reject(new Error('WalletConnect UMD loaded but EthereumProvider export missing'));
          return;
        }
        resolve(ns.EthereumProvider);
      };
      s.onerror = () => reject(new Error('Failed to load WalletConnect from CDN'));
      document.head.appendChild(s);
    });
    return _wcLoadPromise;
  }

  // ─── WalletManager class ─────────────────────────────────────────
  class WalletManager {
    constructor() {
      this.connected = false;
      this.address = null;
      this.chainId = null;
      this._provider = null;
      this._method = null; // 'injected' | 'wc'
      this._listeners = {};
      this._extDisconnectTimer = null;
      this._wcProvider = null;
      this._wcInitPromise = null;
      this._wcConnectInFlight = null;
    }

    on(event, cb) {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(cb);
    }
    off(event, cb) {
      this._listeners[event] = (this._listeners[event] || []).filter(x => x !== cb);
    }
    _emit(event, data) {
      (this._listeners[event] || []).forEach(cb => {
        try { cb(data); } catch (e) { console.error('[wallet] listener error', e); }
      });
    }

    // ── Session persistence ──────────────────────────────────────
    _saveSession({ method, address, chainId }) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          method, address, chainId, ts: Date.now(),
        }));
      } catch (_) {}
    }
    _loadSession() {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw);
        if (!s || !s.ts || !s.address) return null;
        if (Date.now() - s.ts > SESSION_TTL_MS) {
          this._clearSession();
          return null;
        }
        return s;
      } catch (_) { return null; }
    }
    _clearSession() {
      try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
    }

    // WC scatters keys in localStorage. On a fresh browser session we
    // wipe them so a stale pairing can't silently rehydrate.
    static _purgeOrphanedWalletConnectKeys() {
      try {
        const kill = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('wc@2:') || k === 'WALLETCONNECT_DEEPLINK_CHOICE')) {
            kill.push(k);
          }
        }
        for (const k of kill) localStorage.removeItem(k);
      } catch (_) {}
    }

    // ── Resume (no prompt) ───────────────────────────────────────
    async tryResumeSession() {
      // Detect fresh-load vs. reload. Chrome's "Continue where you left
      // off" would otherwise fake a live session on cold browser start.
      let navType = null;
      try {
        const nav = performance.getEntriesByType && performance.getEntriesByType('navigation');
        navType = nav && nav[0] && nav[0].type;
      } catch (_) {}
      if (navType === 'navigate') {
        this._clearSession();
        WalletManager._purgeOrphanedWalletConnectKeys();
        return false;
      }
      const s = this._loadSession();
      if (!s) {
        WalletManager._purgeOrphanedWalletConnectKeys();
        return false;
      }
      try {
        if (s.method === 'wc')       return await this._resumeWalletConnect();
        if (s.method === 'injected') return await this._resumeInjected();
      } catch (e) {
        console.warn('[wallet] resume failed:', e?.message);
        this._clearSession();
      }
      return false;
    }

    async _resumeInjected() {
      if (!window.ethereum) return false;
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts || !accounts.length) { this._clearSession(); return false; }
      this._provider = window.ethereum;
      this.address = accounts[0].toLowerCase();
      this.chainId = ((await window.ethereum.request({ method: 'eth_chainId' })) || '').toLowerCase();
      this.connected = true;
      this._method = 'injected';
      this._attachListeners();
      this._saveSession({ method: 'injected', address: this.address, chainId: this.chainId });
      this._emit('connected', { address: this.address, resumed: true });
      return true;
    }

    async _resumeWalletConnect() {
      const EthereumProvider = await loadWalletConnectScript().catch(() => null);
      if (!EthereumProvider) return false;
      const provider = await EthereumProvider.init({
        projectId: WC_PROJECT_ID,
        chains: [ELYSIUM_CHAIN_ID_DEC],
        optionalChains: [137, 1],
        showQrModal: false,   // resume — never show QR
        rpcMap: { [ELYSIUM_CHAIN_ID_DEC]: ELYSIUM_RPC },
        metadata: this._metadata(),
      });
      if (!provider.accounts?.length || !provider.session) {
        this._clearSession();
        return false;
      }
      this._provider = provider;
      this._wcProvider = provider;
      this.address = provider.accounts[0].toLowerCase();
      this.chainId = '0x' + (provider.chainId || ELYSIUM_CHAIN_ID_DEC).toString(16);
      this.connected = true;
      this._method = 'wc';
      this._attachListeners();
      this._saveSession({ method: 'wc', address: this.address, chainId: this.chainId });
      this._emit('connected', { address: this.address, resumed: true });
      return true;
    }

    // ── Connect (auto-route) ─────────────────────────────────────
    async connect() {
      try {
        if (window.ethereum) return await this._connectInjected();
        return await this._connectWalletConnect();
      } catch (e) {
        this._emit('error', e.message || 'Connection failed');
        return false;
      }
    }

    // Explicit method — UI chooser passes 'injected' or 'walletconnect'.
    async connectWith(method) {
      try {
        if (method === 'injected') {
          if (!window.ethereum) {
            this._emit('error', 'No injected wallet found. Install MetaMask or pick WalletConnect.');
            return false;
          }
          return await this._connectInjected();
        }
        if (method === 'walletconnect' || method === 'wc') {
          return await this._connectWalletConnect();
        }
        this._emit('error', `Unknown connect method: ${method}`);
        return false;
      } catch (e) {
        this._emit('error', e.message || 'Connection failed');
        return false;
      }
    }

    hasInjectedProvider() {
      return typeof window !== 'undefined' && !!window.ethereum;
    }

    async _connectInjected() {
      const provider = window.ethereum;
      // Use wallet_requestPermissions (EIP-2255) when supported — forces
      // the popup even if the site was recently revoked. Some MetaMask
      // builds cache stale permissions and let eth_requestAccounts
      // succeed silently otherwise.
      let accounts = [];
      try {
        const perms = await provider.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
        const cav = perms?.[0]?.caveats?.find(c => c.type === 'restrictReturnedAccounts');
        if (cav && Array.isArray(cav.value)) accounts = cav.value;
      } catch (e) {
        if (e && (e.code === -32601 || /not supported|unknown method/i.test(e.message || ''))) {
          accounts = await provider.request({ method: 'eth_requestAccounts' });
        } else {
          throw e;
        }
      }
      if (!accounts.length) accounts = await provider.request({ method: 'eth_accounts' });
      if (!accounts.length) { this._emit('error', 'No accounts approved.'); return false; }

      this._provider = provider;
      this.address = accounts[0].toLowerCase();
      this.chainId = ((await provider.request({ method: 'eth_chainId' })) || '').toLowerCase();
      this.connected = true;
      this._method = 'injected';

      if (this.chainId !== ELYSIUM_CHAIN_ID) {
        await this.ensureElysium();
        const after = await provider.request({ method: 'eth_chainId' });
        this.chainId = (after || '').toLowerCase();
      }
      this._attachListeners();
      this._saveSession({ method: 'injected', address: this.address, chainId: this.chainId });
      this._emit('connected', { address: this.address });
      return true;
    }

    _metadata() {
      return {
        name: 'VulcanX Champions',
        description: 'Raise your creature from whelp to Legendary',
        url: window.location.origin,
        icons: [window.location.origin + '/favicon.ico'],
      };
    }

    async _initWalletConnectProvider() {
      if (this._wcProvider) return this._wcProvider;
      if (this._wcInitPromise) return this._wcInitPromise;
      this._wcInitPromise = (async () => {
        const EthereumProvider = await loadWalletConnectScript();
        const p = await EthereumProvider.init({
          projectId: WC_PROJECT_ID,
          // EXACT mirror of Runner's PROVEN mobile config (runner.vulcan-x.io
          // works on mobile with this same project id). Runner discovered
          // (Trello WedQFISY, 27 May) that the BUILT-IN @walletconnect/modal is
          // broken — it opens an EMPTY QR (no pairing URI, no relay WebSocket).
          // That's why "wallet connect does not work": the modal never pairs.
          // Fix = showQrModal:false + our own display_uri QR/deeplink overlay
          // (wired below), same as Runner.
          chains: [ELYSIUM_CHAIN_ID_DEC],
          optionalChains: [137, 1],
          showQrModal: false,
          rpcMap: { [ELYSIUM_CHAIN_ID_DEC]: ELYSIUM_RPC },
          metadata: this._metadata(),
        });
        // Hand the pairing URI to our own QR/deeplink overlay (Runner pattern).
        try {
          p.on('display_uri', (uri) => {
            console.log('[wallet] WC display_uri:', String(uri).slice(0, 60) + '…');
            if (typeof window !== 'undefined' && typeof window.__showWalletConnectQR === 'function') {
              window.__showWalletConnectQR(uri);
            }
          });
        } catch (e) { console.warn('[wallet] display_uri listener attach failed:', e?.message); }
        this._wcProvider = p;
        return p;
      })().catch((e) => {
        this._wcInitPromise = null;
        throw e;
      });
      return this._wcInitPromise;
    }

    /** Kick WC init off at boot. Fire-and-forget. */
    prewarmWalletConnect() {
      try {
        this._initWalletConnectProvider().catch((e) => {
          console.warn('[wallet] WC prewarm failed:', e?.message);
        });
      } catch (_) {}
    }

    async _connectWalletConnect() {
      if (this._wcConnectInFlight) return this._wcConnectInFlight;
      this._wcConnectInFlight = this.__doConnectWalletConnect()
        .finally(() => { this._wcConnectInFlight = null; });
      return this._wcConnectInFlight;
    }

    async __doConnectWalletConnect() {
      let provider;
      // Emit a status IMMEDIATELY so the UI shows "Preparing…" from the
      // first tick. The actual init (script load + relay handshake) can
      // take 2-5s on cold page load; without this, the button sits dead
      // and testers think nothing's happening.
      this._emit('chainStatus',
        this._wcProvider ? 'Opening wallet…' : 'Preparing WalletConnect…');
      try { provider = await this._initWalletConnectProvider(); }
      catch (e) { this._emit('error', e.message || 'WalletConnect init failed'); return false; }

      try {
        this._emit('chainStatus', 'Opening wallet…');
        if (!provider.session) await provider.connect();   // display_uri fires → our QR overlay opens
        else                    await provider.enable();
        if (typeof window.__hideWalletConnectQR === 'function') { try { window.__hideWalletConnectQR(); } catch (_) {} }
      } catch (e) {
        if (typeof window.__hideWalletConnectQR === 'function') { try { window.__hideWalletConnectQR(); } catch (_) {} }
        this._emit('error', (e && e.message) || 'Connection cancelled');
        console.warn('[wallet] WC connect error:', e);
        return false;
      }

      const accounts = provider.accounts || [];
      if (!accounts.length) { this._emit('error', 'No accounts approved.'); return false; }

      this._provider = provider;
      this.address = accounts[0].toLowerCase();
      this.chainId = '0x' + (provider.chainId || ELYSIUM_CHAIN_ID_DEC).toString(16);
      this.connected = true;
      this._method = 'wc';

      if (this.chainId !== ELYSIUM_CHAIN_ID) await this.ensureElysium();

      this._attachListeners();
      this._saveSession({ method: 'wc', address: this.address, chainId: this.chainId });
      this._emit('connected', { address: this.address });
      return true;
    }

    // ── Chain helpers ────────────────────────────────────────────
    async ensureElysium() {
      if (!this._provider) return false;
      try {
        await this._provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ELYSIUM_CHAIN_ID }],
        });
        return true;
      } catch (e) {
        if (e?.code === 4902 ||
            e?.data?.originalError?.code === 4902 ||
            /not.*added|unrecognized chain/i.test(e?.message || '')) {
          try {
            await this._provider.request({
              method: 'wallet_addEthereumChain',
              params: [ELYSIUM_CHAIN_PARAMS],
            });
            return true;
          } catch (_) { return false; }
        }
        return false;
      }
    }

    // ── Connection health check ──────────────────────────────────
    // Reconciles our cached state (this.connected / this.address) with
    // the provider's actual live state. Idle browsers / phone sleeps
    // can silently kill the provider session while our UI still thinks
    // we're connected — that's exactly what Salman flagged ("wallet
    // shows connected, but purchase says 'wallet not connected'").
    //
    // Returns:  true if provider still has accounts → connection live
    //           false if no accounts → we were stale; caller should
    //                 prompt reconnect
    // Throws only on totally unreachable providers.
    async verifyConnection() {
      if (!this._provider || !this.address) return false;
      try {
        const accs = await this._provider.request({ method: 'eth_accounts' });
        if (!accs || !accs.length) {
          // Provider is alive but no accounts — session expired or
          // user disconnected the site externally. Tear down our
          // cached state so the next interaction prompts afresh.
          this.disconnect();
          return false;
        }
        // Account may have silently changed (switched account in MM)
        const live = accs[0].toLowerCase();
        if (live !== this.address) {
          this.address = live;
          this._emit('accountChanged', this.address);
          const s = this._loadSession();
          if (s) this._saveSession({ ...s, address: this.address });
        }
        return true;
      } catch (e) {
        console.warn('[wallet] verifyConnection failed:', e?.message);
        return false;
      }
    }

    // Called when verifyConnection returned false. Tries to silently
    // re-hydrate from the stored session (works for recent sessions
    // that are still valid on the provider side, just not cached
    // locally). Returns true if we recovered, false if the caller
    // must prompt an interactive reconnect.
    async tryAutoReconnect() {
      try {
        const ok = await this.tryResumeSession();
        return !!ok;
      } catch (_) { return false; }
    }

    // Interactive reconnect: when the silent resume fails, ACTIVELY prompt the
    // wallet so MetaMask actually pops up — instead of throwing "please
    // reconnect" and forcing the user to manually disconnect/reconnect
    // (AngelHorn, 24 Jun). Injected → _connectInjected() fires
    // wallet_requestPermissions/eth_requestAccounts (guaranteed popup);
    // WalletConnect → re-open the WC modal. Returns true if reconnected.
    async promptReconnect() {
      try {
        if (typeof window !== 'undefined' && window.ethereum) {
          return await this._connectInjected();
        }
        return await this._connectWalletConnect();
      } catch (_) { return false; }
    }

    // ── Signing helpers ──────────────────────────────────────────
    async personalSign(message) {
      // Pre-flight: verify the provider still has accounts. Fixes the
      // idle-desync bug where the UI says "connected" but the provider
      // has evicted our session.
      const alive = await this.verifyConnection();
      if (!alive) {
        let recovered = await this.tryAutoReconnect();
        if (!recovered) recovered = await this.promptReconnect();  // pop the wallet (MetaMask) instead of forcing a manual reconnect
        if (!recovered) throw new Error('Wallet session expired — please reconnect.');
      }
      return await this._provider.request({
        method: 'personal_sign',
        params: [message, this.address],
      });
    }

    async sendDummyTx(label) {
      const alive = await this.verifyConnection();
      if (!alive) {
        let recovered = await this.tryAutoReconnect();
        if (!recovered) recovered = await this.promptReconnect();  // pop the wallet (MetaMask) instead of forcing a manual reconnect
        if (!recovered) throw new Error('Wallet session expired — please reconnect.');
      }
      // QA "ceremony" — proves the user signed off on the action
      // (adopt / rename / shop) without moving any value or touching
      // chain state. Pivoted to personal_sign after two distinct on-
      // chain failures (tester 2026-04-26):
      //   1. burn-address block on 0x…dEaD (MetaMask 11+ unacknowledgeable warning)
      //   2. "External transactions to internal accounts cannot include data"
      //      rejection on Elysium for self-send-with-data
      // personal_sign has no gas, no chain rules, no wallet warnings —
      // every wallet implements it cleanly and the user still sees a
      // wallet prompt with the VulcanX-tagged message. Returns the
      // signature (callers don't read it; was txHash before).
      // Mainnet (real 5 PYR adoption fee) will swap back to a real tx
      // against a treasury contract — flagged in the launch checklist.
      const message =
        `VulcanX: ${label}\n` +
        `Wallet: ${this.address}\n` +
        `Time:   ${new Date().toISOString()}`;
      const signature = await this.personalSign(message);
      return signature;
    }

    // Real native-PYR transfer (Elysium) to a recipient — the production
    // payment path that replaces the sendDummyTx ceremony. NO `data` field
    // (Elysium rejects external-to-EOA txs that carry data — the same quirk
    // that broke the old self-send tx). valueHex is 0x-prefixed wei.
    // Returns the tx hash.
    async sendPyr(to, valueHex, label) {
      const alive = await this.verifyConnection();
      if (!alive) {
        let recovered = await this.tryAutoReconnect();
        if (!recovered) recovered = await this.promptReconnect();  // pop the wallet (MetaMask) instead of forcing a manual reconnect
        if (!recovered) throw new Error('Wallet session expired — please reconnect.');
      }
      const txHash = await this._provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: this.address, to, value: valueHex }],
      });
      console.log('[pay]', label, '→', to, txHash);
      return txHash;
    }

    explorerTx(hash) { return `${ELYSIUM_EXPLORER}/tx/${hash}`; }

    // ── Listeners + external-disconnect polling ──────────────────
    _attachListeners() {
      const p = this._provider;
      if (!p || !p.on) return;
      p.on('accountsChanged', (accs) => {
        const next = (accs && accs[0]) || null;
        if (!next) { this.disconnect(); return; }
        this.address = next.toLowerCase();
        this._emit('accountChanged', this.address);
      });
      p.on('chainChanged', (id) => {
        this.chainId = (id || '').toLowerCase();
        const s = this._loadSession();
        if (s) this._saveSession({ ...s, chainId: this.chainId });
        this._emit('chainChanged', this.chainId);
      });
      p.on('disconnect', () => this.disconnect());
      this._startExternalDisconnectPoll();
    }

    _startExternalDisconnectPoll() {
      this._stopExternalDisconnectPoll();
      // Only poll injected — WC has its own session machinery
      if (!this._provider || this._provider !== window.ethereum) return;
      this._extDisconnectTimer = setInterval(async () => {
        if (!this.connected || !this._provider) { this._stopExternalDisconnectPoll(); return; }
        try {
          const accs = await this._provider.request({ method: 'eth_accounts' });
          if (!accs || !accs.length) {
            console.log('[wallet] external disconnect detected — tearing down');
            this.disconnect();
          } else if (this.address && accs[0].toLowerCase() !== this.address) {
            this.address = accs[0].toLowerCase();
            this._emit('accountChanged', this.address);
          }
        } catch (_) {}
      }, 15000);
    }

    _stopExternalDisconnectPoll() {
      if (this._extDisconnectTimer) {
        clearInterval(this._extDisconnectTimer);
        this._extDisconnectTimer = null;
      }
    }

    async disconnect() {
      this._stopExternalDisconnectPoll();
      try {
        if (this._provider && typeof this._provider.disconnect === 'function') {
          await this._provider.disconnect();
        }
      } catch (_) {}
      if (window.ethereum && window.ethereum.request) {
        try {
          await window.ethereum.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }],
          });
        } catch (_) {}
      }
      this._clearSession();
      WalletManager._purgeOrphanedWalletConnectKeys();
      this._provider = null;
      this._wcProvider = null;
      this.connected = false;
      this.address = null;
      this._method = null;
      this._emit('disconnected');
    }

    // ── Utility ──────────────────────────────────────────────────
    shortAddress() {
      if (!this.address) return '';
      return this.address.slice(0, 6) + '…' + this.address.slice(-4);
    }
  }

  // Expose to the page

  // ─── WalletConnect QR / deep-link overlay ─────────────────────────
  // Ported from Runner (the proven mobile flow): the built-in WC modal is
  // broken (empty QR), so we render the pairing URI ourselves — QR for
  // desktop scan + a tap-to-open deep link for mobile.
  window.__showWalletConnectQR = function (uri) {
    try { window.__hideWalletConnectQR(); } catch (_) {}
    const overlay = document.createElement('div');
    overlay.id = 'vx-wc-qr-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:20000;background:rgba(10,6,2,0.88);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);';
    const qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=' + encodeURIComponent(uri) + '&bgcolor=ffffff&color=000000&qzone=1';
    const deepLink = String(uri).startsWith('wc:') ? ('https://metamask.app.link/wc?uri=' + encodeURIComponent(uri)) : uri;
    overlay.innerHTML = `
      <div style="width:min(360px,92vw);padding:24px;border-radius:14px;background:linear-gradient(180deg,rgba(46,30,16,0.97),rgba(22,14,10,0.97));border:2px solid rgba(255,205,107,0.5);box-shadow:0 24px 80px rgba(0,0,0,0.6);color:#ffeccd;text-align:center;font-family:inherit;">
        <div style="font-size:15px;letter-spacing:3px;color:#ffcd6b;margin-bottom:8px;font-weight:800;">CONNECT VIA WALLETCONNECT</div>
        <div style="font-size:11px;opacity:0.65;margin-bottom:16px;">Scan with your wallet app, or tap below if you're on mobile</div>
        <div style="background:#fff;padding:12px;border-radius:10px;display:inline-block;margin-bottom:14px;">
          <img src="${qrSrc}" alt="WalletConnect QR" style="display:block;width:260px;height:260px;max-width:70vw;max-height:70vw;" />
        </div>
        <a href="${deepLink}" target="_blank" rel="noopener noreferrer"
           style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:12px;margin-bottom:8px;border-radius:8px;background:linear-gradient(135deg,#3b99fc,#1e5ca8);color:#fff;font-weight:800;letter-spacing:1px;text-decoration:none;font-size:13px;">🦊 OPEN IN METAMASK APP</a>
        <button id="vx-wc-copy" style="width:100%;padding:9px;font-size:11px;letter-spacing:1.5px;margin-bottom:6px;background:none;border:1px solid rgba(255,205,107,0.35);border-radius:8px;color:#ffeccd;cursor:pointer;">📋 COPY PAIRING LINK</button>
        <button id="vx-wc-cancel" style="width:100%;padding:9px;font-size:11px;letter-spacing:2px;opacity:0.7;background:none;border:1px solid rgba(255,205,107,0.25);border-radius:8px;color:#ffeccd;cursor:pointer;">CANCEL</button>
      </div>`;
    document.body.appendChild(overlay);
    const copy = overlay.querySelector('#vx-wc-copy');
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(uri);
        copy.textContent = '✓ COPIED'; copy.style.color = '#7ed26b';
        setTimeout(() => { copy.textContent = '📋 COPY PAIRING LINK'; copy.style.color = ''; }, 1500);
      } catch (_) { copy.textContent = '⚠ COPY FAILED — long-press the QR'; }
    });
    overlay.querySelector('#vx-wc-cancel').addEventListener('click', () => window.__hideWalletConnectQR());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) window.__hideWalletConnectQR(); });
  };
  window.__hideWalletConnectQR = function () {
    const el = document.getElementById('vx-wc-qr-overlay');
    if (el) el.remove();
  };

  window.VXWalletManager = WalletManager;
  window.vxWallet = new WalletManager();

  // Eager prewarm for users without an injected wallet — those are the
  // keepers who'll use WalletConnect and suffer the 2-5s cold init.
  // For MetaMask users we skip it to avoid a wasted 1.8MB fetch.
  // Fire at idle-time so the main thread stays responsive for rendering.
  function schedulePrewarm() {
    if (window.ethereum) return;  // MM user — no WC needed
    try {
      window.vxWallet.prewarmWalletConnect();
    } catch (_) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedulePrewarm, { once: true });
  } else {
    // requestIdleCallback falls back to setTimeout where unsupported (Safari).
    const ric = window.requestIdleCallback
      || ((fn) => setTimeout(fn, 50));
    ric(schedulePrewarm, { timeout: 1000 });
  }
})();
