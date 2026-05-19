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
// IMPORTANT: Every metric string below has been aligned with Rana's
// seeded gateway catalog (verified 2026-05-19). Gateway silently
// drops deltas whose metric isn't in the catalog — DO NOT rename
// without coordinating with Rana first.
//
// Quest mapping (catalog row → metric → fires when):
//
//   First Hatch          (lifetime)  champion_created                first champion_create
//   Daily Feed           (daily)     champion_feed                   every feed
//   Adventure Apprentice (weekly)    adventure_quest_completed       every quest_complete
//   Hard Quester         (weekly)    hard_quest_completed            quest_complete tier=hard
//   Blooded Evolution    (weekly)    champion_evolved                every evolve
//   The Ascendant        (lifetime)  champion_reached_stage_18       first time stage_idx>=17
//   Legendary            (lifetime)  champion_reached_stage_20       first time stage_idx>=19
//   Arena Initiate       (weekly)    arena_win                       every arena win
//   Apex Predator        (weekly)    arena_win                       same metric, weekly scope
//   Coliseum Veteran     (monthly)   arena_win                       same metric, monthly scope
//   First Blood          (lifetime)  arena_win                       first arena win
//   Direct Combat        (weekly)    direct_invite_sent              every invite_create
//   Direct Conquest      (weekly)    direct_invite_win               every invite_accept win
//   Champion of Champs   (weekly)    direct_invite_win               same metric
//   Defender's Honor     (weekly)    defender_win                    won as defender
//   Campaign Push        (weekly)    campaign_chapter_completed_new  every boss-clear
//   Conquer the Pits     (lifetime)  campaign_chapter_1_cleared      chapter_id==1
//   Conquer the Coliseum (lifetime)  campaign_chapter_2_cleared      chapter_id==2
//   Conquer the Wastes   (lifetime)  campaign_chapter_3_cleared      chapter_id==3
//   Conquer the Citadel  (lifetime)  campaign_chapter_4_cleared      chapter_id==4
//   Apex Champion        (lifetime)  campaign_chapter_5_cleared      chapter_id==5
//   Daily Bond           (daily)     bond_delta                      every positive bump
//   Bond Builder         (weekly)    bond_delta                      same metric, weekly scope
//   Master Trainer       (lifetime)  champion_bond_reached_50        first 50-crossing
//   Soulbound            (lifetime)  champion_bond_reached_100       first 100-crossing
//   Forge Spree          (weekly)    equipment_change                every equipItem
//   Forge Mastery        (weekly)    full_kit_weapon_3armor_equipped weapon + 3+ armor
//   Fully Forged         (lifetime)  full_kit_weapon_all_6_armor_equipped weapon + 6 armor
//   Stable Visit         (daily)     stable_full_view                viewed all owned today
//   Daily Care Action    (daily)     unique_care_day                 first care event of UTC day
//   Daily Feed Streak 7  (weekly)    daily_care_streak_hit_7         streak hit 7
//   Iron Streak          (monthly)   daily_care_streak_hit_28        streak hit 28
//   Trait Tinker         (weekly)    trait_potion_consumed           every trait-potion feed

// ── Adoption ────────────────────────────────────────────────────────

export function fromChampionCreate(_meta = {}) {
  return [{ metric: 'champion_created', delta: 1 }];
}

// ── Feeding ─────────────────────────────────────────────────────────

export function fromFeedPotion(meta = {}) {
  const out = [{ metric: 'champion_feed', delta: 1 }];
  // potion_kind = minor|major|epic|evolution|healing
  // Trait Tinker counts only minor/major/epic (the stat-allocation kind).
  const k = meta.potion_kind;
  if (k === 'minor' || k === 'major' || k === 'epic') {
    out.push({ metric: 'trait_potion_consumed', delta: 1 });
  }
  return out;
}

// ── Adventure quests (in-game per-champion adventures) ─────────────

export function fromAdventureComplete(meta = {}) {
  const out = [{ metric: 'adventure_quest_completed', delta: 1 }];
  if (meta.tier === 'hard') {
    out.push({ metric: 'hard_quest_completed', delta: 1 });
  }
  return out;
}

// ── Evolution ──────────────────────────────────────────────────────

export function fromEvolve(meta = {}) {
  const out = [{ metric: 'champion_evolved', delta: 1 }];
  const to = Number(meta.to_stage);
  if (Number.isFinite(to)) {
    if (to >= 19) out.push({ metric: 'champion_reached_stage_20', delta: 1 });
    if (to >= 17) out.push({ metric: 'champion_reached_stage_18', delta: 1 });
  }
  return out;
}

// ── Arena ──────────────────────────────────────────────────────────

export function fromArenaBattle(meta = {}) {
  // arena_win is the canonical seeded metric — Daily Skirmish + Apex
  // Predator + Coliseum Veteran + First Blood all read off it via
  // scope buckets (daily/weekly/monthly/lifetime) on the gateway.
  const out = [];
  if (meta.won) {
    out.push({ metric: 'arena_win', delta: 1 });
  }
  if (meta.won && meta.mode === 'invite') {
    out.push({ metric: 'direct_invite_win', delta: 1 });
  }
  if (meta.won && meta.was_defender) {
    out.push({ metric: 'defender_win', delta: 1 });
  }
  return out;
}

export function fromInviteCreate(_meta = {}) {
  return [{ metric: 'direct_invite_sent', delta: 1 }];
}

// ── Campaign ───────────────────────────────────────────────────────

export function fromCampaignBoss(meta = {}) {
  const chapId = Number(meta.chapter_id);
  if (!Number.isFinite(chapId) || chapId < 1 || chapId > 5) return [];
  return [
    { metric: 'campaign_chapter_completed_new', delta: 1 },
    { metric: `campaign_chapter_${chapId}_cleared`, delta: 1 },
  ];
}

// ── Bond ───────────────────────────────────────────────────────────

export function fromBondDelta(meta = {}) {
  const out = [];
  const d = Math.max(0, Math.floor(Number(meta.delta) || 0));
  if (d > 0) out.push({ metric: 'bond_delta', delta: d });

  const before = Number(meta.before_bond);
  const after  = Number(meta.new_bond);
  if (Number.isFinite(before) && Number.isFinite(after)) {
    if (before < 50  && after >= 50)  out.push({ metric: 'champion_bond_reached_50',  delta: 1 });
    if (before < 100 && after >= 100) out.push({ metric: 'champion_bond_reached_100', delta: 1 });
  }
  return out;
}

// ── Equipment ──────────────────────────────────────────────────────

export function fromEquipChange(meta = {}) {
  const out = [{ metric: 'equipment_change', delta: 1 }];
  if (meta.weapon && Number(meta.armor_count) >= 3) {
    out.push({ metric: 'full_kit_weapon_3armor_equipped', delta: 1 });
  }
  if (meta.weapon && Number(meta.armor_count) >= 6) {
    out.push({ metric: 'full_kit_weapon_all_6_armor_equipped', delta: 1 });
  }
  return out;
}

// ── Stable view ────────────────────────────────────────────────────

export function fromStableVisit(meta = {}) {
  const viewed = Number(meta.viewed_count);
  const owned  = Number(meta.total_owned);
  if (Number.isFinite(viewed) && Number.isFinite(owned) && owned > 0 && viewed >= owned) {
    return [{ metric: 'stable_full_view', delta: 1 }];
  }
  return [];
}

// ── Streak milestones (caller decides when to fire) ───────────────

export function fromFeedStreakMilestone(streak) {
  const s = Number(streak);
  if (s === 7)  return [{ metric: 'daily_care_streak_hit_7',  delta: 1 }];
  if (s === 28) return [{ metric: 'daily_care_streak_hit_28', delta: 1 }];
  return [];
}

// ── First-care-action-of-the-day marker ───────────────────────────
// Caller (vulcanxTracker.recordDailyCare) wraps this with a per-UTC-day
// localStorage flag so it only fires once per day per wallet.

export function dailyCareActionMetric() {
  return { metric: 'unique_care_day', delta: 1 };
}
