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
        setLoginBroadcast(); // notify other .vulcan-x.io subdomains of the new session

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
        setLogoutBroadcast(); // notify other .vulcan-x.io subdomains
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

    // ── Cross-subdomain broadcast cookies ────────────────────────────────────
    // JS-writable cookies on Domain=.vulcan-x.io shared across all subdomains.
    // localStorage events are origin-scoped and cannot cross subdomains.

    var LOGOUT_BROADCAST_KEY = 'vx_logout_ts';
    var LOGIN_BROADCAST_KEY  = 'vx_login_ts';

    function getRootDomain() {
        if (typeof window === 'undefined') return undefined;
        var parts = window.location.hostname.split('.');
        if (parts.length < 2) return undefined;
        return '.' + parts.slice(-2).join('.');
    }

    function writeBroadcastCookie(key) {
        if (typeof document === 'undefined') return;
        try {
            var domain    = getRootDomain();
            var secure    = location.protocol === 'https:' ? '; Secure' : '';
            var domainAttr = domain ? '; Domain=' + domain : '';
            var expires   = new Date(Date.now() + 5 * 60 * 1000).toUTCString();
            document.cookie = key + '=' + Date.now() + '; Path=/; Expires=' + expires + '; SameSite=Strict' + domainAttr + secure;
        } catch (e) { /* ignore */ }
    }

    function readBroadcastCookie(key) {
        if (typeof document === 'undefined') return 0;
        try {
            var match = document.cookie.match(new RegExp('(?:^|;\\s*)' + key + '=([^;]+)'));
            return match ? parseInt(match[1], 10) : 0;
        } catch (e) {
            return 0;
        }
    }

    function setLoginBroadcast()  { writeBroadcastCookie(LOGIN_BROADCAST_KEY); }
    function setLogoutBroadcast() { writeBroadcastCookie(LOGOUT_BROADCAST_KEY); }
    function getLoginBroadcast()  { return readBroadcastCookie(LOGIN_BROADCAST_KEY); }
    function getLogoutBroadcast() { return readBroadcastCookie(LOGOUT_BROADCAST_KEY); }

    /**
     * Poll vx_logout_ts every 1.5s. Calls onLogout() when another subdomain logs out.
     * Returns a cleanup function.
     */
    function startCrossdomainLogoutWatch(onLogout) {
        var knownTs = { current: getLogoutBroadcast() };
        var id = setInterval(function () {
            var ts = getLogoutBroadcast();
            if (ts !== knownTs.current) {
                knownTs.current = ts;
                if (ts > 0) {
                    try { onLogout(); } catch (e) { /* never let the callback crash the poll */ }
                }
            }
        }, 1500);
        return function () { clearInterval(id); };
    }

    /**
     * Full SSO sync — covers both while-tab-visible and tab-switch cases.
     *
     * Polls vx_login_ts and vx_logout_ts every 1.5s. When a login broadcast is
     * detected and /me confirms the session, calls onLogin(user). When a logout
     * broadcast is detected (or /me returns non-200 on a tab switch), calls
     * onLogout(). Also fires on visibilitychange so a tab-switch back always
     * re-validates.
     *
     * @param {(user: object) => void} onLogin   Called when an SSO login is detected
     * @param {() => void}             onLogout  Called when a logout is detected
     * @returns {() => void}                     Cleanup — call to stop all sync
     */
    function startSSOSync(onLogin, onLogout) {
        if (!GATEWAY_URL) return function () {};

        var knownLoginTs  = getLoginBroadcast();
        var knownLogoutTs = getLogoutBroadcast();
        var inFlight      = false;

        async function runMeCheck() {
            if (inFlight) return;
            inFlight = true;
            try {
                var user = await verifyCookieIdentity();
                if (user && user.walletAddress) {
                    if (typeof onLogin === 'function') {
                        try { onLogin(user); } catch (e) { /* ignore callback errors */ }
                    }
                } else {
                    if (typeof onLogout === 'function') {
                        try { onLogout(); } catch (e) { /* ignore callback errors */ }
                    }
                }
            } catch (e) {
                // network blip — keep current state
            } finally {
                inFlight = false;
            }
        }

        var pollId = setInterval(function () {
            var loginTs  = getLoginBroadcast();
            var logoutTs = getLogoutBroadcast();

            if (loginTs !== knownLoginTs) {
                knownLoginTs = loginTs;
                if (loginTs > 0) void runMeCheck();
            }
            if (logoutTs !== knownLogoutTs) {
                knownLogoutTs = logoutTs;
                if (logoutTs > 0 && typeof onLogout === 'function') {
                    try { onLogout(); } catch (e) { /* ignore */ }
                }
            }
        }, 1500);

        function onVisibilityChange() {
            if (document.visibilityState === 'visible') void runMeCheck();
        }

        document.addEventListener('visibilitychange', onVisibilityChange);

        return function () {
            clearInterval(pollId);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }

    // Expose as window.vxAuth — wallet.js + inline boot code in index.html
    // both consume from this single global.
    global.vxAuth = {
        isAuthEnabled:               isAuthEnabled,
        loadCachedJwt:               loadCachedJwt,
        verifyCookieIdentity:        verifyCookieIdentity,
        runAuthFlow:                 runAuthFlow,
        clearLocalAuth:              clearLocalAuth,
        clearAuth:                   clearAuth,
        setLoginBroadcast:           setLoginBroadcast,
        setLogoutBroadcast:          setLogoutBroadcast,
        getLoginBroadcast:           getLoginBroadcast,
        getLogoutBroadcast:          getLogoutBroadcast,
        startCrossdomainLogoutWatch: startCrossdomainLogoutWatch,
        startSSOSync:                startSSOSync,
    };
})(typeof window !== 'undefined' ? window : this);
