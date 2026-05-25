// ─── Gateway auth — wallet-signature → JWT → SSO cookie ─────────
// Ports VulcanRunner-V2 / VulcanPoker-V2 SSO module to Champions' static-SPA
// shape. Champions has no bundler, so config is read from window.__VX_GATEWAY_URL__
// (set inline in index.html before this script loads) and the module exposes
// itself as `window.vxAuth` for wallet.js to consume — no ESM imports.
//
// Cookie model: the SSO cookie `vulcanx_access_token` is set SERVER-SIDE by
// Auth.Unified's AccountController on a successful connect-wallet response
// (HttpOnly + Secure in prod). JavaScript cannot read or overwrite an
// HttpOnly cookie, so:
//   - Producer (sign-in): get-session-key → personal_sign → connect-wallet,
//     all with credentials:'include' so the browser stores the Set-Cookie.
//   - Consumer (already signed in elsewhere): GET /v1/api/Account/me with
//     credentials:'include'. If 200 we silently adopt the identity.
//
// All calls fail soft. Without window.__VX_GATEWAY_URL__, isAuthEnabled()
// returns false and Champions falls back to whatever wallet.js does
// without gateway auth (currently: nothing — the wallet just stays
// "connected" locally with no JWT).
(function (global) {
    'use strict';

    var GATEWAY_URL = (typeof global !== 'undefined' && global.__VX_GATEWAY_URL__) || '';

    var LS_TOKEN   = 'vx:gateway_jwt';
    var LS_EXPIRES = 'vx:gateway_jwt_expires';
    var LS_WALLET  = 'vx:gateway_jwt_wallet';

    var EXPIRY_BUFFER_MS = 60000;

    var ME_ENDPOINT     = '/v1/api/Account/me';
    var LOGOUT_ENDPOINT = '/v1/api/Account/logout';

    function isAuthEnabled() {
        return !!GATEWAY_URL;
    }

    // Synchronous fast path — wallet-scoped LS cache. Returns the JWT if
    // present, current wallet matches, and not within the EXPIRY_BUFFER_MS
    // window. SSO cookie is HttpOnly so not readable here; use
    // verifyCookieIdentity() for the cookie path.
    function loadCachedJwt(walletAddress) {
        if (typeof window === 'undefined' || !walletAddress) return null;
        try {
            var token        = localStorage.getItem(LS_TOKEN);
            var expiresAtRaw = localStorage.getItem(LS_EXPIRES);
            var cachedWallet = localStorage.getItem(LS_WALLET);
            if (!token || !expiresAtRaw || !cachedWallet) return null;
            if (cachedWallet.toLowerCase() !== walletAddress.toLowerCase()) return null;
            if (Date.now() >= new Date(expiresAtRaw).getTime() - EXPIRY_BUFFER_MS) return null;
            return token;
        } catch (e) {
            return null;
        }
    }

    // Consumer SSO check. Returns the user object on /me 200, null otherwise.
    // Optionally pass walletAddress to enforce wallet match (rejects a cookie
    // issued for a different wallet that the user since switched in MetaMask).
    async function verifyCookieIdentity(walletAddress) {
        if (!GATEWAY_URL) return null;
        try {
            var r = await fetch(GATEWAY_URL + ME_ENDPOINT, {
                method: 'GET',
                credentials: 'include',
            });
            if (!r.ok) return null;
            var body = await r.json();
            var user = body && body.data;
            if (!user || !user.walletAddress) return null;
            if (walletAddress
                && user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                return null;
            }
            return user;
        } catch (e) {
            return null;
        }
    }

    // Producer sign-in. signRpc(message) => 0x… signature — caller passes
    // a function so this module stays provider-agnostic (works with
    // window.ethereum, WalletConnect, etc).
    async function runAuthFlow(walletAddress, signRpc) {
        if (!GATEWAY_URL)         throw new Error('window.__VX_GATEWAY_URL__ not configured');
        if (!walletAddress)       throw new Error('walletAddress required');
        if (typeof signRpc !== 'function') throw new Error('signRpc must be a function');

        var skRes = await fetch(GATEWAY_URL + '/v1/api/Account/get-session-key', {
            method: 'POST',
            credentials: 'include',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ walletAddress: walletAddress }),
        });
        if (!skRes.ok) throw new Error('get-session-key ' + skRes.status);
        var skBody = await skRes.json();
        var sessionKey = skBody && skBody.data && skBody.data.sessionKey;
        if (!sessionKey) throw new Error('gateway returned no session key');

        var signature = await signRpc(sessionKey);
        if (!signature || signature.indexOf('0x') !== 0) {
            throw new Error('wallet returned no signature');
        }

        var cwRes = await fetch(GATEWAY_URL + '/v1/api/Account/connect-wallet', {
            method: 'POST',
            credentials: 'include',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ walletAddress: walletAddress, signature: signature }),
        });
        if (!cwRes.ok) throw new Error('connect-wallet ' + cwRes.status);
        var cwBody = await cwRes.json();
        var data = cwBody && cwBody.data;
        if (!data || !data.accessToken) throw new Error('gateway returned no access token');

        var token = data.accessToken;
        var expiresAt = data.expiresAt
            ? new Date(data.expiresAt)
            : new Date(Date.now() + 60 * 60 * 1000);

        saveJwtToStorage(token, expiresAt, walletAddress);

        return { token: token, expiresAt: expiresAt, user: data.user || null };
    }

    // Local-only cleanup (use when /me already returned 401 — server side
    // already considers us logged out, no need to spam /logout).
    function clearLocalAuth() {
        if (typeof window === 'undefined') return;
        try {
            localStorage.removeItem(LS_TOKEN);
            localStorage.removeItem(LS_EXPIRES);
            localStorage.removeItem(LS_WALLET);
        } catch (e) { /* ignore */ }
    }

    // Best-effort JS-side cookie eviction. Tries multiple attribute combos
    // so at least one matches the server's original set. Browser silently
    // rejects writes to HttpOnly cookies (security), so this only works
    // if the cookie was set NOT HttpOnly. Always paired with the server
    // /logout response which is the authoritative clear.
    function clearCookieClientSide() {
        if (typeof document === 'undefined') return;
        var host = (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
        var base = 'vulcanx_access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; samesite=lax';
        document.cookie = base;
        document.cookie = base + '; secure';
        if (host.endsWith('vulcan-x.io')) {
            document.cookie = base + '; domain=.vulcan-x.io';
            document.cookie = base + '; domain=.vulcan-x.io; secure';
        }
        if (host) {
            document.cookie = base + '; domain=' + host;
        }
    }

    // Full tear-down — LS + server cookie. Fire the server /logout, then
    // wipe LS sync. On a 200 (or even network failure) we also attempt the
    // JS cookie clear belt-and-suspenders.
    function clearAuth() {
        clearLocalAuth();
        if (!GATEWAY_URL) {
            clearCookieClientSide();
            return Promise.resolve();
        }
        return fetch(GATEWAY_URL + LOGOUT_ENDPOINT, {
            method: 'POST',
            credentials: 'include',
        })
        .then(function (r) { if (r.ok) clearCookieClientSide(); })
        .catch(function () { clearCookieClientSide(); });
    }

    function saveJwtToStorage(token, expiresAt, walletAddress) {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(LS_TOKEN,   token);
            localStorage.setItem(LS_EXPIRES, expiresAt.toISOString());
            localStorage.setItem(LS_WALLET,  walletAddress.toLowerCase());
        } catch (e) { /* quota / private mode */ }
    }

    // Expose as window.vxAuth — wallet.js + inline boot code in index.html
    // both consume from this single global.
    global.vxAuth = {
        isAuthEnabled:        isAuthEnabled,
        loadCachedJwt:        loadCachedJwt,
        verifyCookieIdentity: verifyCookieIdentity,
        runAuthFlow:          runAuthFlow,
        clearLocalAuth:       clearLocalAuth,
        clearAuth:            clearAuth,
    };
})(typeof window !== 'undefined' ? window : this);
