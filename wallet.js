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
    nativeCurrency: { name: 'LAVA', symbol: 'LAVA', decimals: 18 },
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
        optionalChains: [1, 137],
        showQrModal: false,
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
          chains: [ELYSIUM_CHAIN_ID_DEC],
          optionalChains: [1, 137], // mainnet + polygon for session handshake compat
          showQrModal: true,
          qrModalOptions: {
            themeMode: 'dark',
            themeVariables: { '--wcm-z-index': '20000', '--w3m-z-index': '20000' },
          },
          rpcMap: { [ELYSIUM_CHAIN_ID_DEC]: ELYSIUM_RPC },
          metadata: this._metadata(),
        });
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
        if (!provider.session) await provider.connect();
        else                    await provider.enable();
      } catch (e) {
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

    // ── Signing helpers ──────────────────────────────────────────
    async personalSign(message) {
      // Pre-flight: verify the provider still has accounts. Fixes the
      // idle-desync bug where the UI says "connected" but the provider
      // has evicted our session.
      const alive = await this.verifyConnection();
      if (!alive) {
        const recovered = await this.tryAutoReconnect();
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
        const recovered = await this.tryAutoReconnect();
        if (!recovered) throw new Error('Wallet session expired — please reconnect.');
      }
      await this.ensureElysium();
      const dataHex = '0x' + Array.from(new TextEncoder().encode(`VulcanX:${label}`))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      const txHash = await this._provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: this.address,
          to: '0x000000000000000000000000000000000000dEaD',
          value: '0x0',
          data: dataHex,
        }],
      });
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
