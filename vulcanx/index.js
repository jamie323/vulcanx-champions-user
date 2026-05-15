// VulcanX Quest tracker entry point for Champions.
//
// Champions' index.html is a single-file SPA — non-module inline scripts
// can't easily import this module's exports. So we expose the tracker
// API on a global window.VxQuestTracker that the inline scripts call.
//
// Boot:
//   <script type="module" src="vulcanx/index.js?v=...">
//   ...
//   // After wallet is bound:
//   await window.VxQuestTracker.init({ wallet });
//
// Then sprinkle window.VxQuestTracker.record('metric', delta) at
// emit sites — bond/equipment/stable/etc. — and the tracker handles
// batching, persistence, flush, and gateway poll.

import * as Tracker from './vulcanxTracker.js';
import * as M from './metricsFromEvent.js';

// Public surface — small, stable. Inline scripts call into this.
const api = {
  init:           Tracker.init,
  stop:           Tracker.stop,
  record:         Tracker.record,
  recordMany:     Tracker.recordMany,
  recordDailyCare: Tracker.recordDailyCare,
  wasCelebrated:  Tracker.wasCelebrated,
  markCelebrated: Tracker.markCelebrated,
  isFrenzyPass:   Tracker.isFrenzyPassActive,

  // Derivation helpers — call these with the event meta to get the
  // metric deltas to record. Keeps the metric-naming logic in one
  // place; inline scripts don't have to know metric names.
  metrics: M,
};

// Expose on window for inline-script consumers.
if (typeof window !== 'undefined') {
  window.VxQuestTracker = api;

  // Dev overlay: same shape as Poker's __poker_vulcanx_dev, named for
  // Champions. Always installed; harmless in prod (no UI, just methods).
  window.__champions_vulcanx_dev = {
    state:    Tracker._state,
    flushNow: Tracker._flushNow,
    pollNow:  Tracker._pollNow,
    record:   Tracker.record,
    init:     Tracker.init,
    metrics:  M,
  };

  // One-line breadcrumb so a console reader can see the tracker is loaded.
  console.log('[vulcanx] tracker loaded. window.VxQuestTracker ready.');
}

export default api;
