// Pure derivation: take a Champions gameplay event and return the
// list of VulcanX metric deltas to push for that event.
//
// All metrics are POSITIVE INTEGER DELTAS — that's all the gateway
// accepts. State-based signals are modelled as "delta:1 once per
// UTC day" via the daily-dedup wrapper in vulcanxTracker.js.
//
// Bucket B-style metrics (browser doesn't have the data) flow from
// the server-side edge functions writing directly to the outbox.
// Browser tracker handles only the signals the browser KNOWS about
// after a successful apiFetch (or in the case of bond/equipment,
// from VxBond/Equipment local state).
//
// Quest mapping (catalog row → metric → fires when):
//
//   First Hatch          (lifetime)  champion_adoptions          first champion_create
//   Daily Feed           (daily)     champions_fed               every feed
//   Adventure Apprentice (weekly)    adventure_quests_completed  every quest_complete
//   Hard Quester         (weekly)    adventure_quests_completed_hard  quest_complete tier=hard
//   Blooded Evolution    (weekly)    champion_evolutions         every evolve
//   The Ascendant        (lifetime)  champion_reached_stage_18   first time stage_idx>=17
//   Legendary            (lifetime)  champion_reached_stage_20   first time stage_idx>=19
//   Arena Initiate       (weekly)    pvp_battles_won             every arena win
//   Apex Predator        (weekly)    pvp_battles_won             same metric, weekly scope
//   Coliseum Veteran     (monthly)   pvp_battles_won             same metric, monthly scope
//   First Blood          (lifetime)  pvp_battles_won             first arena win
//   Direct Combat        (weekly)    pvp_invites_sent            every invite_create
//   Direct Conquest      (weekly)    pvp_invite_wins             every invite_accept win
//   Champion of Champs   (weekly)    pvp_invite_wins             same metric
//   Campaign Push        (weekly)    campaign_chapters_cleared   every boss-clear
//   Conquer the Pits     (lifetime)  campaign_chapter_1_cleared  chapter_id==1
//   Conquer the Coliseum (lifetime)  campaign_chapter_2_cleared  chapter_id==2
//   Conquer the Wastes   (lifetime)  campaign_chapter_3_cleared  chapter_id==3
//   Conquer the Citadel  (lifetime)  campaign_chapter_4_cleared  chapter_id==4
//   Apex Champion        (lifetime)  campaign_chapter_5_cleared  chapter_id==5
//   Daily Bond           (daily)     bond_points_gained          every positive bump
//   Bond Builder         (weekly)    bond_points_gained          same metric, weekly scope
//   Master Trainer       (lifetime)  bond_milestone_50           first 50-crossing
//   Soulbound            (lifetime)  bond_milestone_100          first 100-crossing
//   Forge Spree          (weekly)    equipment_pieces_equipped   every equipItem
//   Forge Mastery        (weekly)    equipment_full_kit_3        weapon + 3+ armor
//   Fully Forged         (lifetime)  equipment_full_kit_max      weapon + ALL 6 armor
//   Stable Visit         (daily)     stable_full_views           viewed all owned today
//   Daily Care Action    (daily)     daily_care_action           first care event of UTC day
//   Daily Feed Streak 7  (weekly)    daily_feed_streak_7_hit     streak hit 7
//   Iron Streak          (monthly)   daily_feed_streak_28_hit    streak hit 28

// ── Adoption ────────────────────────────────────────────────────────

export function fromChampionCreate(_meta = {}) {
  return [{ metric: 'champion_adoptions', delta: 1 }];
}

// ── Feeding ─────────────────────────────────────────────────────────

export function fromFeedPotion(meta = {}) {
  // metric name matches Rana's seeded catalog (singular, action-style).
  // Don't switch this without coordinating — the gateway silently
  // drops deltas whose metric isn't in the catalog.
  const out = [{ metric: 'champion_feed', delta: 1 }];
  // potion_kind = minor|major|epic|evolution|healing
  // Trait Tinker counts only minor/major/epic (the stat-allocation kind).
  const k = meta.potion_kind;
  if (k === 'minor' || k === 'major' || k === 'epic') {
    out.push({ metric: 'trait_potions_used', delta: 1 });
  }
  return out;
}

// ── Adventure quests (in-game per-champion adventures) ─────────────

export function fromAdventureComplete(meta = {}) {
  const out = [{ metric: 'adventure_quests_completed', delta: 1 }];
  if (meta.tier === 'hard') {
    out.push({ metric: 'adventure_quests_completed_hard', delta: 1 });
  }
  return out;
}

// ── Evolution ──────────────────────────────────────────────────────

export function fromEvolve(meta = {}) {
  const out = [{ metric: 'champion_evolutions', delta: 1 }];
  const to = Number(meta.to_stage);
  if (Number.isFinite(to)) {
    if (to >= 19) out.push({ metric: 'champion_reached_stage_20', delta: 1 });
    if (to >= 17) out.push({ metric: 'champion_reached_stage_18', delta: 1 });
  }
  return out;
}

// ── Arena ──────────────────────────────────────────────────────────

export function fromArenaBattle(meta = {}) {
  // 'arena_win' is the metric Rana seeded for Daily Skirmish. Keep the
  // additional finer-grained metrics in case Rana seeds quests for
  // them later; they'll be silently dropped until then.
  const out = [{ metric: 'pvp_battles_completed', delta: 1 }];
  if (meta.won) {
    out.push({ metric: 'arena_win',       delta: 1 });   // ← matches catalog
    out.push({ metric: 'pvp_battles_won', delta: 1 });   // aliased for future
  }
  if (meta.won && meta.mode === 'invite') {
    out.push({ metric: 'pvp_invite_wins', delta: 1 });
  }
  if (meta.won && meta.was_defender) {
    out.push({ metric: 'pvp_defender_wins', delta: 1 });
  }
  return out;
}

export function fromInviteCreate(_meta = {}) {
  return [{ metric: 'pvp_invites_sent', delta: 1 }];
}

// ── Campaign ───────────────────────────────────────────────────────

export function fromCampaignBoss(meta = {}) {
  const chapId = Number(meta.chapter_id);
  if (!Number.isFinite(chapId) || chapId < 1 || chapId > 5) return [];
  return [
    { metric: 'campaign_chapters_cleared', delta: 1 },
    { metric: `campaign_chapter_${chapId}_cleared`, delta: 1 },
  ];
}

// ── Bond ───────────────────────────────────────────────────────────

export function fromBondDelta(meta = {}) {
  const out = [];
  const d = Math.max(0, Math.floor(Number(meta.delta) || 0));
  if (d > 0) out.push({ metric: 'bond_points_gained', delta: d });

  const before = Number(meta.before_bond);
  const after  = Number(meta.new_bond);
  if (Number.isFinite(before) && Number.isFinite(after)) {
    if (before < 50  && after >= 50)  out.push({ metric: 'bond_milestone_50', delta: 1 });
    if (before < 100 && after >= 100) out.push({ metric: 'bond_milestone_100', delta: 1 });
  }
  return out;
}

// ── Equipment ──────────────────────────────────────────────────────

export function fromEquipChange(meta = {}) {
  const out = [{ metric: 'equipment_pieces_equipped', delta: 1 }];
  if (meta.weapon && Number(meta.armor_count) >= 3) {
    out.push({ metric: 'equipment_full_kit_3', delta: 1 });
  }
  if (meta.weapon && Number(meta.armor_count) >= 6) {
    out.push({ metric: 'equipment_full_kit_max', delta: 1 });
  }
  return out;
}

// ── Stable view ────────────────────────────────────────────────────

export function fromStableVisit(meta = {}) {
  const viewed = Number(meta.viewed_count);
  const owned  = Number(meta.total_owned);
  if (Number.isFinite(viewed) && Number.isFinite(owned) && owned > 0 && viewed >= owned) {
    return [{ metric: 'stable_full_views', delta: 1 }];
  }
  return [];
}

// ── Streak milestones (caller decides when to fire) ───────────────

export function fromFeedStreakMilestone(streak) {
  const s = Number(streak);
  if (s === 7)  return [{ metric: 'daily_feed_streak_7_hit',  delta: 1 }];
  if (s === 28) return [{ metric: 'daily_feed_streak_28_hit', delta: 1 }];
  return [];
}

// ── First-care-action-of-the-day marker ───────────────────────────
// Caller (vulcanxTracker.recordDailyCare) wraps this with a per-UTC-day
// localStorage flag so it only fires once per day per wallet.

export function dailyCareActionMetric() {
  return { metric: 'daily_care_action', delta: 1 };
}
