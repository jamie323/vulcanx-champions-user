// VulcanX Quest HTTP — Champions browser bundle
//
// Plain ES module, no build step. Mirror of the Poker reference impl
// (vulcan-poker-web/apps/web/src/lib/poker/vulcanx/questHttp.ts).
// Only constants change: DEFAULT_SERVICE_ID = 'vulcan-champions'.
//
// Production write path:
//   Browser → POST /functions/v1/quest-progress-collect (shared Supabase)
//   → quest_progress_outbox  →  pg_cron drains every 60s
//   → quest-progress-flush signs (HMAC) and POSTs to VulcanX gateway
//
// JWT + HMAC secret live in Supabase function env, never reach the
// browser. Anti-spoof handled server-side: quest-progress-collect
// looks up the player by device_id and uses the bound wallet (NOT
// the wallet field the browser sends).
//
// Spec ref: ~/Downloads/Quest/Quest-integration.txt
// Handoff ref: ~/VulcanRunner/handoff/poker-champions-integration.md

const DEFAULT_BASE_URL   = 'https://dev-new-api.vulcan-x.io';
const DEFAULT_SERVICE_ID = 'vulcan-champions';

// Same Supabase project that hosts Champions' own edge functions
// (champion_create / champion_feed_potion / etc) — and that hosts
// the shared quest-progress-collect / quest-progress-flush functions.
const SUPABASE_URL = 'https://pdhhezseiulsjhvnbrfr.supabase.co';

// Anon key is the standard Supabase public key. The page sets
// window.SUPABASE_ANON_KEY at boot from its existing config (the
// same way the rest of the app calls FN_BASE/apiFetch). Defensive
// fallback so the tracker degrades gracefully if not set yet —
// isConfigured() will be false and the tracker stays dormant.
function _supabaseAnonKey() {
  if (typeof window === 'undefined') return '';
  return window.SUPABASE_ANON_KEY || window.__SUPABASE_ANON_KEY__ || '';
}

const FETCH_TIMEOUT_MS = 8_000;

// ── Public helpers ─────────────────────────────────────────────────

/** UUID v4 — one per flush attempt, used as batch_id for server-side
 *  dedupe (15-min Redis TTL on the gateway). Falls back to a manual
 *  generator on browsers without crypto.randomUUID. */
export function newBatchId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Activation gate: true iff running in a browser with the anon key
 *  reachable. No gateway secrets required. */
export function isConfigured() {
  return typeof window !== 'undefined' && !!_supabaseAnonKey();
}

// ── Players upsert ──────────────────────────────────────────────────
//
// quest-progress-collect looks up the player by device_id and uses
// THAT player's wallet (anti-spoof). So a Champions wallet has to
// have a row in the shared `players` table before deltas can flow.
// The players-upsert edge function is idempotent — we call it once
// on tracker init.

export async function ensurePlayer(args) {
  if (!args?.deviceId || !args?.wallet) {
    throw new Error('ensurePlayer: deviceId + wallet required');
  }
  const url = `${SUPABASE_URL}/functions/v1/players-upsert`;
  const body = {
    device_id: args.deviceId,
    wallet:    String(args.wallet).toLowerCase(),
  };
  return _fetchJson(url, {
    method: 'POST',
    headers: _supabaseHeaders(),
    body: JSON.stringify(body),
  });
}

// ── Write path: POST /functions/v1/quest-progress-collect ──

export async function postBatchViaCollect(args) {
  if (!args?.deviceId) throw new Error('postBatchViaCollect: deviceId required');
  if (!Array.isArray(args.entries)) throw new Error('postBatchViaCollect: entries[] required');
  if (args.entries.length === 0) return { inserted: 0 };

  const url = `${SUPABASE_URL}/functions/v1/quest-progress-collect`;
  const body = {
    device_id: args.deviceId,
    wallet:    args.wallet ? String(args.wallet).toLowerCase() : undefined,
    service:   args.service || DEFAULT_SERVICE_ID,
    entries:   args.entries.map((e) => ({
      metric: String(e.metric || '').trim().slice(0, 64),
      delta:  Math.max(1, Math.floor(Number(e.delta) || 0)),
    })),
  };
  return _fetchJson(url, {
    method: 'POST',
    headers: _supabaseHeaders(),
    body: JSON.stringify(body),
  });
}

// ── Read path: GET /api/vulcanx/Quest/active (catalog + per-wallet) ──
//
// Routed through OUR Supabase proxy (champion_quest_gateway_proxy)
// rather than hitting the gateway directly. Two reasons:
//   1. /active requires a Bearer service JWT when wallet is supplied —
//      the JWT must stay server-side.
//   2. The gateway doesn't send CORS headers for GitHub Pages / our
//      domain — direct browser fetch fails with "Access-Control-Allow-
//      Origin missing" + 401. The proxy is on our Supabase project so
//      its CORS is open by default.
// neurodrills hit this in DevTools console on 2026-05-18.

export async function getActiveQuests(args = {}) {
  const params = new URLSearchParams();
  params.set('game', args.game || DEFAULT_SERVICE_ID);
  if (args.wallet) params.set('wallet', String(args.wallet).toLowerCase());
  const url = `${SUPABASE_URL}/functions/v1/champion_quest_gateway_proxy?${params.toString()}`;
  return _fetchJson(url, {
    method: 'GET',
    headers: _supabaseHeaders(),
  });
}

// ── Internal ───────────────────────────────────────────────────────

function _supabaseHeaders() {
  const key = _supabaseAnonKey();
  return {
    Authorization:   `Bearer ${key}`,
    apikey:          key,
    'Content-Type':  'application/json',
  };
}

async function _fetchJson(url, opts) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : null;
  try {
    const resp = await fetch(url, { ...opts, signal: controller?.signal });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      const err = new Error(`HTTP ${resp.status}: ${text.slice(0, 300)}`);
      err.status = resp.status;
      err.body = text;
      throw err;
    }
    const txt = await resp.text();
    if (!txt) return {};
    try { return JSON.parse(txt); }
    catch { return { raw: txt }; }
  } finally {
    if (timer) clearTimeout(timer);
  }
}
