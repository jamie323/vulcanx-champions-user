// ============================================================
// VulcanX Champions — Equipment catalog (Phase 3b, 2026-04-26)
//
// Source of truth: PHASE3A_EQUIPMENT_PROPOSAL.md (Jamie-locked).
// Mirrors the design doc 1:1 — keep them in sync.
//
// Exports (window.Equipment):
//   - SLOTS                   slot definitions + species-lock rules
//   - RARITY                  4-tier rarity table (mult + color + label)
//   - CATALOG                 31 base designs (24 weapons + 3 armor + 2 trinket + 1 boot + 1 aura)
//   - powerValue(item)        equipment power contribution to PowerScore
//   - itemDisplayName(item)   "Rare Heavy Axe" formatting
//   - canEquip(item, champ)   species-lock + slot rules
// ============================================================

(function () {
  // ─── SLOTS ──────────────────────────────────────────────────────
  const SLOTS = {
    weapon:  { label: 'Weapon',  speciesLocked: true,  icon: '⚔' },
    armor:   { label: 'Armor',   speciesLocked: false, icon: '🛡' },
    trinket: { label: 'Trinket', speciesLocked: false, icon: '💍' },
    boots:   { label: 'Boots',   speciesLocked: false, icon: '👢' },
    aura:    { label: 'Aura',    speciesLocked: false, icon: '✨' },
  };

  // ─── RARITY ─────────────────────────────────────────────────────
  const RARITY = {
    common:    { mult: 1.05, color: '#a1a1ad', label: 'Common',    weight: 70 },
    rare:      { mult: 1.12, color: '#5d8eff', label: 'Rare',      weight: 22 },
    epic:      { mult: 1.25, color: '#b169ff', label: 'Epic',      weight:  7 },
    legendary: { mult: 1.50, color: '#ffcd6b', label: 'Legendary', weight:  1 },
  };
  const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];

  // ─── CATALOG ────────────────────────────────────────────────────
  // Each entry is one design. A player's owned INSTANCE is { catalogId,
  // rarity, rolledStat? }. Power value computed from base * rarity mult.
  //
  // Fields:
  //   slot:           which slot this fits into
  //   species:        if slot.speciesLocked, must match champion species
  //   stat:           primary stat the piece scales (for weapons + power calc)
  //   weaponMult:     multiplier on the stat for weapons (unused for non-weapons)
  //   weaponType:     'phys' | 'magic' | 'hybrid' | 'shield' (weapons only)
  //   statBoosts:     for armor/trinket/boots/aura: {STAT: pct} additive to growth
  //   sig:            signature effect key (combat resolver looks this up)
  //   description:    short flavor + mechanics line shown in UI
  const CATALOG = {
    // ── ORC weapons (3) ─────────────────────────────────────────
    heavy_axe:        { slot:'weapon', species:'orc',     stat:'STR', weaponMult:1.5, weaponType:'phys',  sig:null,              description:'Pure damage, no special. Reliable bruiser.' },
    war_maul:         { slot:'weapon', species:'orc',     stat:'STR', weaponMult:1.3, weaponType:'phys',  sig:'stunning_crit',   description:'Crits stun the opponent for 1 round.' },
    tusked_greatclub: { slot:'weapon', species:'orc',     stat:'STR', weaponMult:1.4, weaponType:'phys',  sig:'echo_strike',     description:'25% of attack damage echoes next round.' },
    // ── ELF weapons (3) ─────────────────────────────────────────
    longbow:          { slot:'weapon', species:'elf',     stat:'INT', weaponMult:1.4, weaponType:'magic', sig:'pierce',          description:'Ignores 25% of opponent armor (anti-tank).' },
    curved_dagger:    { slot:'weapon', species:'elf',     stat:'AGI', weaponMult:1.2, weaponType:'phys',  sig:'twin_strike',     description:'Twin Strike — second hit at 40% damage.' },
    moonblade:        { slot:'weapon', species:'elf',     stat:'INT', weaponMult:1.2, weaponType:'magic', sig:'lunar_cycle',     description:'Alternates phys/magic damage type each round.' },
    // ── GOBLIN weapons (3) ──────────────────────────────────────
    poison_shiv:      { slot:'weapon', species:'goblin',  stat:'AGI', weaponMult:1.2, weaponType:'phys',  sig:'venom',           description:'Venom — stacking 5% max-HP poison per hit.' },
    slingshot:        { slot:'weapon', species:'goblin',  stat:'LCK', weaponMult:1.4, weaponType:'phys',  sig:'lucky_shot',      description:'20% independent dodge chance per round.' },
    saw_cutlass:      { slot:'weapon', species:'goblin',  stat:'AGI', weaponMult:1.2, weaponType:'phys',  sig:'frenzied_hacks',  description:'On crit, immediate extra attack at 30%.' },
    // ── DEMON weapons (3) ───────────────────────────────────────
    hellbrand:        { slot:'weapon', species:'demon',   stat:'INT', weaponMult:1.5, weaponType:'magic', sig:'spellbreaker',    description:'Magic damage ignores 25% spell resist.' },
    soul_tome:        { slot:'weapon', species:'demon',   stat:'INT', weaponMult:1.3, weaponType:'magic', sig:'drain',           description:'15% chance per hit to heal 50% of damage.' },
    pact_dagger:      { slot:'weapon', species:'demon',   stat:'INT', weaponMult:1.2, weaponType:'magic', sig:'blood_sacrifice', description:'Sacrifice 10% HP for +50% damage (>50% HP).' },
    // ── DRAKKIN weapons (3) ─────────────────────────────────────
    drake_claw:       { slot:'weapon', species:'drakkin', stat:'STR', weaponMult:1.3, weaponType:'hybrid',sig:'hybrid_strike',   description:'Damage is 50% STR + 50% INT.' },
    storm_lance:      { slot:'weapon', species:'drakkin', stat:'AGI', weaponMult:1.2, weaponType:'magic', sig:'chain_arc',       description:'On crit, second hit auto-fires for 40%.' },
    wyrm_mace:        { slot:'weapon', species:'drakkin', stat:'STR', weaponMult:1.3, weaponType:'phys',  sig:'dragonhide',      description:'+5% damage reduction per round survived (cap +20%).' },
    // ── DWARF weapons (3) ───────────────────────────────────────
    forge_hammer:     { slot:'weapon', species:'dwarf',   stat:'STR', weaponMult:1.4, weaponType:'phys',  sig:'crushing_blow',   description:'Crits stun for 1 round.' },
    tower_shield:     { slot:'weapon', species:'dwarf',   stat:'STR', weaponMult:1.0, weaponType:'shield',sig:'bulwark',         description:'+20% damage reduction always on. Defensive.' },
    runic_pickaxe:    { slot:'weapon', species:'dwarf',   stat:'STR', weaponMult:1.3, weaponType:'phys',  sig:'vein_strike',     description:'15% chance per hit: next attack guaranteed crit.' },
    // ── BEASTKIN weapons (3) ────────────────────────────────────
    beast_claws:      { slot:'weapon', species:'beastkin',stat:'STR', weaponMult:1.3, weaponType:'phys',  sig:'frenzy',          description:'Frenzy — second hit at 40% damage.' },
    bone_spear:       { slot:'weapon', species:'beastkin',stat:'STR', weaponMult:1.4, weaponType:'phys',  sig:'killing_instinct',description:'+25% crit vs opponents below 50% HP.' },
    tooth_daggers:    { slot:'weapon', species:'beastkin',stat:'AGI', weaponMult:1.3, weaponType:'phys',  sig:'pack_frenzy',     description:'+5% AGI per crit landed (cap +25%).' },
    // ── WRAITH weapons (3) ──────────────────────────────────────
    spirit_blade:     { slot:'weapon', species:'wraith',  stat:'INT', weaponMult:1.2, weaponType:'magic', sig:'phasing_strike',  description:'20% chance per hit to ignore enemy armor.' },
    soul_catcher:     { slot:'weapon', species:'wraith',  stat:'INT', weaponMult:1.4, weaponType:'magic', sig:'soul_bind',       description:'On match win, gain +20% all stats next match.' },
    banshee_staff:    { slot:'weapon', species:'wraith',  stat:'INT', weaponMult:1.3, weaponType:'magic', sig:'wail',            description:'Round 1: opponent AGI reduced by 30.' },

    // ── ARMOR (3, cross-species) ────────────────────────────────
    light_plate:      { slot:'armor',   stat:'AGI', statBoosts:{VIT:0.10, AGI:0.10}, sig:'nimble',  description:'+10% dodge chance. Glass-cannon armor.' },
    battle_mail:      { slot:'armor',   stat:'VIT', statBoosts:{VIT:0.20},           sig:null,      description:'Balanced. The default pick.' },
    heavy_cuirass:    { slot:'armor',   stat:'VIT', statBoosts:{VIT:0.40, AGI:-0.20},sig:'fortify', description:'+15% damage reduction. Slow, heavy.' },

    // ── TRINKETS (2, cross-species) ─────────────────────────────
    power_ring:       { slot:'trinket', stat:'rolled', statBoosts:{ROLL:0.10}, sig:null,             description:'+10% to a random rolled stat (decided at drop).' },
    lucky_charm:      { slot:'trinket', stat:'LCK',    statBoosts:{LCK:0.15},  sig:'fortune_favors', description:'+15% LCK + 10% global proc chance.' },

    // ── BOOTS (1, cross-species) ────────────────────────────────
    swift_boots:      { slot:'boots',   stat:'AGI', statBoosts:{AGI:0.20}, sig:'first_step', description:'+initiative bonus, almost always wins ties.' },

    // ── AURA (1, cross-species) ─────────────────────────────────
    aura_of_power:    { slot:'aura',    stat:'all', statBoosts:{ALL:0.05}, sig:'radiance',   description:'+5% all stats (Common) up to +20% (Legendary).' },
  };

  // ─── HELPERS ────────────────────────────────────────────────────

  // Normalise an instance: { catalogId, rarity, rolledStat? } → full item
  // record by merging with CATALOG[catalogId].
  function resolveInstance(inst) {
    const cat = CATALOG[inst.catalogId];
    if (!cat) return null;
    return { ...cat, ...inst, catalog: cat };
  }

  // Display name like "Rare Heavy Axe" or "Legendary Power Ring (STR)".
  function itemDisplayName(inst) {
    const cat = CATALOG[inst.catalogId];
    if (!cat) return '?';
    const rarityLabel = RARITY[inst.rarity]?.label || '';
    const baseName = ucfirst(inst.catalogId.replace(/_/g, ' '));
    const rolled = inst.rolledStat ? ` (${inst.rolledStat})` : '';
    return `${rarityLabel} ${baseName}${rolled}`;
  }
  function ucfirst(s) { return s.replace(/\b\w/g, c => c.toUpperCase()); }

  // Equipment power contribution to PowerScore. Per GDD §13:
  //   piece_power = base_value × rarity_mult × 100
  // For weapons base_value is the stat mult delta (e.g., 1.5 → 0.5 → 50 power × rarity).
  // For armor/trinkets/boots base_value is the sum of stat boost percentages.
  // For aura base_value is the all-stat boost.
  function powerValue(inst) {
    const cat = CATALOG[inst.catalogId];
    if (!cat) return 0;
    const rar = RARITY[inst.rarity] || RARITY.common;
    let base = 0;
    if (cat.slot === 'weapon') {
      // Tower Shield is the only ×1.0 weapon — give it a baseline so it
      // still contributes to power (its value is in DR, not stat scaling).
      const delta = Math.max(0.2, cat.weaponMult - 1.0);
      base = delta * 500;
    } else {
      // Sum stat boosts (handles ROLL and ALL pseudo-keys conservatively)
      const boosts = cat.statBoosts || {};
      let sum = 0;
      for (const [k, v] of Object.entries(boosts)) {
        if (k === 'ALL') sum += Math.abs(v) * 6; // applies to all 6 stats
        else if (k === 'ROLL') sum += Math.abs(v);
        else sum += Math.abs(v);
      }
      base = sum * 500;
    }
    return Math.round(base * rar.mult);
  }

  // Equip rules: species-lock for weapons; slot must match.
  function canEquip(inst, championSpecies, slot) {
    const cat = CATALOG[inst.catalogId];
    if (!cat) return false;
    if (cat.slot !== slot) return false;
    if (SLOTS[slot].speciesLocked && cat.species !== championSpecies) return false;
    return true;
  }

  // Sum equipmentTotal across an array of equipped instances. Used by
  // PowerScore wrapper. Pass [] if no items.
  function totalPowerFromEquipped(instances) {
    let total = 0;
    for (const inst of (instances || [])) total += powerValue(inst);
    return total;
  }

  // ─── EXPORT ─────────────────────────────────────────────────────
  window.Equipment = {
    SLOTS, RARITY, RARITY_ORDER, CATALOG,
    resolveInstance, itemDisplayName, powerValue, canEquip, totalPowerFromEquipped,
  };
})();
