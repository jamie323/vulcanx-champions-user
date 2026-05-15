// VulcanX Quest tracker — Champions browser bundle
//
// In-memory aggregator → 60s flush via /quest-progress-collect →
// pg_cron drains the outbox → HMAC-signed POST to VulcanX gateway →
// player's user_state.current ticks up on the gateway side.
//
// Every 30s: poll /api/vulcanx/Quest/active for completed quests we
// haven't fired the celebration for yet. Catches cross-device
// completions, mid-session catalog additions, lagging local state.
//
// Cross-tracker dedup: shared name-keyed localStorage flag. Both this
// tracker AND any local optimistic celebration must write/read the
// SAME `name:${name.toLowerCase().trim()}|${period_key}` key. See
// wasCelebrated / markCelebrated below.

import {
  postBatchViaCollect,
  getActiveQuests,
  ensurePlayer,
  isConfigured,
} from './questHttp.js';

import * as M from './metricsFromEvent.js';

// ── Tuning ────────────────────────────────────────────────────────────

const FLUSH_INTERVAL_MS         = 60_000;   // matches Runner/Poker
const COMPLETION_POLL_MS        = 30_000;
const COMPLETION_POLL_KICKOFF_MS =  5_000;

const LS_PENDING_DELTAS    = 'vc_vulcanx_pending_deltas';
const LS_FIRED_COMPLETIONS = 'vc_vulcanx_fired_completions';
const LS_DAILY_CARE_DONE   = 'vc_vulcanx_daily_care_done';   // {wallet}:{YYYY-MM-DD}
const LS_DEVICE_ID         = 'vc_vulcanx_device_id';

// ── State ─────────────────────────────────────────────────────────────

let _wallet = null;
let _deviceId = null;
let _pending = new Map();           // key=`${wallet}|${metric}` → { wallet, metric, delta }
let _flushTimer = null;
let _pollTimer = null;
let _inFlight = false;
let _frenzyPassActive = false;

// ── Public API ────────────────────────────────────────────────────────

/** Init for the current wallet. Idempotent — re-callable when the
 *  identity changes. Returns a promise that resolves once the player
 *  row is ensured on the shared `players` table. */
export async function init(opts) {
  if (!isConfigured()) {
    console.debug('[vulcanx] not configured, tracker dormant');
    return false;
  }
  const wallet = String(opts?.wallet || '').toLowerCase();
  if (!wallet) return false;

  const deviceId = _resolveDeviceId();

  if (_wallet === wallet && _deviceId === deviceId && _flushTimer) {
    return true;                                    // already running
  }
  if (_wallet && _wallet !== wallet) {
    // Identity change — drop queue, the deltas were for the previous wallet.
    _pending.clear();
    _saveQueue();
  }
  _wallet   = wallet;
  _deviceId = deviceId;
  _pending  = _loadQueue();

  // Ensure the player row exists. Best-effort — if it fails we still
  // start the loops; players-upsert is idempotent so subsequent ticks
  // can call it. The collect endpoint returns 404 until the player
  // exists, but we don't surface that to gameplay.
  try {
    await ensurePlayer({ wallet, deviceId });
  } catch (e) {
    console.warn('[vulcanx] ensurePlayer failed (will retry on flush):', e?.message);
  }

  _startFlushLoop();
  _startPollLoop();
  return true;
}

/** Teardown — used on wallet disconnect / logout. */
export function stop() {
  if (_flushTimer) { clearInterval(_flushTimer); _flushTimer = null; }
  if (_pollTimer)  { clearInterval(_pollTimer);  _pollTimer  = null; }
  _wallet = null; _deviceId = null;
}

/** Queue a positive-delta metric push. Aggregates same-(wallet, metric). */
export function record(metric, delta = 1) {
  if (!_wallet || !metric) return;
  const d = Math.max(0, Math.floor(Number(delta) || 0));
  if (d === 0) return;
  const key = `${_wallet}|${metric}`;
  const prev = _pending.get(key);
  if (prev) prev.delta += d;
  else      _pending.set(key, { wallet: _wallet, metric, delta: d });
  _saveQueue();
}

/** Queue many. Convenience for derivation helpers. */
export function recordMany(entries) {
  if (!Array.isArray(entries)) return;
  for (const e of entries) record(e?.metric, e?.delta ?? 1);
}

/** Record the once-per-UTC-day "daily care action" milestone. Returns
 *  true if this was the day's first care event (delta was emitted),
 *  false if already counted. Used by Diligent Keeper-style quests. */
export function recordDailyCare() {
  if (!_wallet) return false;
  const today = new Date().toISOString().slice(0, 10);
  const map = _readDailyCare();
  const key = `${_wallet}:${today}`;
  if (map[key]) return false;
  map[key] = true;
  _writeDailyCare(map);
  const m = M.dailyCareActionMetric();
  record(m.metric, m.delta);
  return true;
}

/** Frenzy Pass status from the latest /active response. False until
 *  the first successful poll. */
export function isFrenzyPassActive() {
  return _frenzyPassActive;
}

// ── Cross-tracker dedup ──────────────────────────────────────────────
//
// Both this tracker (gateway-poll celebrations) AND any local
// optimistic celebration must check + mark via these helpers. Keyed
// by quest NAME + period_key so it works even when the local tracker
// and the gateway use different IDs for the same quest.

function _firedKey(name, period_key) {
  return `name:${String(name || '').trim().toLowerCase()}|${period_key || 'lifetime'}`;
}

export function wasCelebrated(name, period_key) {
  return !!_readFired()[_firedKey(name, period_key)];
}

export function markCelebrated(name, period_key) {
  const f = _readFired();
  f[_firedKey(name, period_key)] = true;
  _writeFired(f);
}

// ── Internal: flush loop ─────────────────────────────────────────────

function _startFlushLoop() {
  if (_flushTimer) return;
  _flushTimer = setInterval(() => { void _flush(); }, FLUSH_INTERVAL_MS);
}

async function _flush() {
  if (_inFlight) return;
  if (_pending.size === 0) return;
  if (!_wallet || !_deviceId) return;

  const snapshot = Array.from(_pending.values());
  _inFlight = true;
  try {
    const res = await postBatchViaCollect({
      deviceId: _deviceId,
      wallet:   _wallet,
      entries:  snapshot.map((e) => ({ metric: e.metric, delta: e.delta })),
    });
    // Drop the deltas we successfully sent. New deltas queued while
    // in-flight stay (we mutate _pending, not snapshot).
    for (const entry of snapshot) {
      const key = `${entry.wallet}|${entry.metric}`;
      const live = _pending.get(key);
      if (!live) continue;
      if (live.delta === entry.delta) _pending.delete(key);
      else live.delta -= entry.delta;
    }
    _saveQueue();
    if (res?.dropped > 0) {
      console.warn(`[vulcanx] collect dropped ${res.dropped} entries`);
    }
  } catch (e) {
    // 403 wallet-not-bound → re-attempt ensurePlayer next tick.
    if (e?.status === 403 || e?.status === 404) {
      try { await ensurePlayer({ wallet: _wallet, deviceId: _deviceId }); }
      catch (_) { /* will retry */ }
    }
    console.warn('[vulcanx] flush failed, retry next tick:', e?.message);
  } finally {
    _inFlight = false;
  }
}

// ── Internal: gateway /active poll ───────────────────────────────────

function _startPollLoop() {
  if (_pollTimer) return;
  if (typeof window === 'undefined') return;
  _pollTimer = setTimeout(() => {
    void _poll();
    _pollTimer = setInterval(() => { void _poll(); }, COMPLETION_POLL_MS);
  }, COMPLETION_POLL_KICKOFF_MS);
}

async function _poll() {
  if (!_wallet) return;
  let data;
  try { data = await getActiveQuests({ wallet: _wallet }); }
  catch (e) {
    console.warn('[vulcanx] /active poll failed:', e?.message);
    return;
  }
  if (!data || !Array.isArray(data.quests)) return;
  _frenzyPassActive = !!data.frenzy_pass?.active;

  for (const q of data.quests) {
    if (!q?.id) continue;
    if (!q.user_state?.system_completed) continue;
    const period = q.period_key ?? 'lifetime';
    if (wasCelebrated(q.name, period)) continue;
    markCelebrated(q.name, period);
    _fireCelebration(q, period);
  }
}

function _fireCelebration(q, period_key) {
  // Champions' celebration modal lives in the page (defined in index.html).
  // Page exposes window.VxQuestCelebration.fire(modalShape). If the page
  // hasn't booted that yet, the call no-ops harmlessly.
  const slug = q.slug || q.id;
  const desc = q.short_description ?? q.full_description ?? q.description ?? '';
  const modal = {
    id:          slug,
    name:        q.name,
    description: desc,
    chest_count: q.chest_count ?? 1,
    chest_name:  'Mystery Chest',          // per spec: no rarity tiers
    reveal_url:  q.reveal_url ?? `https://vulcan-x.io/quests?highlight=${encodeURIComponent(slug)}`,
    period_key,
  };
  try {
    if (typeof window !== 'undefined' && window.VxQuestCelebration?.fire) {
      window.VxQuestCelebration.fire(modal);
    }
  } catch (e) {
    console.warn('[vulcanx] celebration.fire threw', e);
  }
}

// ── Internal: deviceId + localStorage ────────────────────────────────

function _resolveDeviceId() {
  if (typeof window === 'undefined') return null;
  let id;
  try { id = window.localStorage.getItem(LS_DEVICE_ID); }
  catch { id = null; }
  if (!id) {
    id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'vc-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { window.localStorage.setItem(LS_DEVICE_ID, id); } catch (_) {}
  }
  return id;
}

function _loadQueue() {
  if (typeof window === 'undefined') return new Map();
  try {
    const arr = JSON.parse(window.localStorage.getItem(LS_PENDING_DELTAS) || '[]');
    const m = new Map();
    for (const e of arr) {
      if (!e || !e.wallet || !e.metric) continue;
      m.set(`${e.wallet}|${e.metric}`, {
        wallet: e.wallet,
        metric: e.metric,
        delta:  Number(e.delta) || 0,
      });
    }
    return m;
  } catch { return new Map(); }
}
function _saveQueue() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_PENDING_DELTAS, JSON.stringify(Array.from(_pending.values())));
  } catch {}
}
function _readFired() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(window.localStorage.getItem(LS_FIRED_COMPLETIONS) || '{}'); }
  catch { return {}; }
}
function _writeFired(f) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(LS_FIRED_COMPLETIONS, JSON.stringify(f)); }
  catch {}
}
function _readDailyCare() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(window.localStorage.getItem(LS_DAILY_CARE_DONE) || '{}'); }
  catch { return {}; }
}
function _writeDailyCare(f) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(LS_DAILY_CARE_DONE, JSON.stringify(f)); }
  catch {}
}

// Internal accessors for the dev overlay.
export function _state() {
  return {
    wallet: _wallet, deviceId: _deviceId,
    pending: Array.from(_pending.values()),
    fired: _readFired(),
    frenzyPassActive: _frenzyPassActive,
  };
}
export function _flushNow() { return _flush(); }
export function _pollNow()  { return _poll();  }
