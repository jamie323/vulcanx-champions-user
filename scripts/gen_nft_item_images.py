#!/usr/bin/env python3
"""
gen_nft_item_images.py — equipment + limited-potion NFT art generator.

Uses the same gpt-image-1.5 OpenAI Images API as gen_bloodlines_openai.py
(same style family as the champion art so the collection reads as one set),
but with 1024×1024 square format because these are product-shot items, not
character portraits.

Output:
  ~/Desktop/Champions_NFT_Images/
    Equipment/
      <NFT Title>.png         # e.g. "Heavy Axe.png", "Battle Mail.png"
      ... (31 files)
    Limited Potions/
      <NFT Title>.png         # e.g. "Founder's Elixir.png"
      ... (5 files)
    metadata.json             # title / description / supply / price per file

Filename convention: matches the on-chain NFT title exactly (with spaces
and apostrophes — macOS/IPFS handle these fine). One image per BASE item;
rarity (Common/Rare/Epic/Legendary) is overlaid as a UI border in-game.

Cost: 36 images at gpt-image-1.5 high-quality 1024×1024 ≈ $2-7 total.
Resume-friendly — already-saved files are skipped.

Usage:
    python3 scripts/gen_nft_item_images.py              # generate everything missing
    python3 scripts/gen_nft_item_images.py --dry-run    # show queue, no API
    python3 scripts/gen_nft_item_images.py --only equipment
    python3 scripts/gen_nft_item_images.py --only potions
    python3 scripts/gen_nft_item_images.py --force      # regenerate even if file exists
"""
from __future__ import annotations

import argparse, base64, json, os, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

SECRETS = Path.home() / ".openclaw" / "secrets.json"
os.environ["OPENAI_API_KEY"] = json.loads(SECRETS.read_text())["OPENAI_API_KEY"]
from openai import OpenAI  # noqa: E402

DEST = Path.home() / "Desktop" / "Champions_NFT_Images"
EQUIP_DIR = DEST / "Equipment"
POTION_DIR = DEST / "Limited Potions"

# ── Style lock ──────────────────────────────────────────────────────
# Tighter than the bloodline style block because items are simpler subjects.
# Carefully phrased to keep painted-3D consistency with the existing
# champion art set (gpt-image-1.5 May session).

STYLE = (
    "Painted-3D rendered illustration, stylised game-asset style, single subject "
    "centred in frame, clean white background (or transparent), painterly "
    "rim-light from upper-left with soft fill, single highlight pass, muted "
    "palette with one accent colour pulled forward. Reads clean at 64-pixel "
    "icon size and detailed at full size. NOT photorealistic, NOT cel-shaded — "
    "the style matches the existing gpt-image-1.5 VulcanX Champions art set. "
    "No text, no logos, no UI chrome, no rarity border (rarity is added in "
    "the game UI, not in the art). No character holding the item, no "
    "battlefield context — pure product-shot presentation."
)


# ── Equipment (31 base items — one image each, used across all 4 rarities) ──
# (nft_title, prompt_concept)
EQUIPMENT = [
    # ORC weapons (3)
    ("Heavy Axe",
     "A two-handed orcish battle axe, broad bearded blade pitted with battle scars, "
     "blackened-steel head, iron-shod haft wrapped in stained leather. Brutalist "
     "tribal feel — bound leather, iron studs, hand-forged not pretty. 3/4 hero angle, "
     "slight tilt."),
    ("War Maul",
     "An orcish war maul, square-headed iron block on a thick haft, runes hammered "
     "into the head face, leather grip with iron bands. A skull-cracker, not a "
     "finesse weapon. Brutalist tribal — blackened steel, hammered detail. 3/4 angle."),
    ("Tusked Greatclub",
     "A massive orcish greatclub, gnarled hardwood with three boar tusks driven into "
     "the head, leather grip wound with sinew. Brutalist tribal — primitive but "
     "deadly. Straight-on hero angle."),
    # ELF weapons (3)
    ("Longbow",
     "An elven longbow, silver-inlaid recurve with eldertree filigree, moon-silk "
     "bowstring, single fletched arrow nocked at half-draw. The bow has a subtle "
     "inner glow at the limbs. Flowing arcane style — silver inlay, moonlit glow. "
     "3/4 angle."),
    ("Curved Dagger",
     "A pair of crossed elven curved daggers laid in an X, silver crescent blades, "
     "eldertree-bark grips, twin moonstones set into the pommels. Flowing arcane — "
     "silver, moonlit blue accents. Top-down product angle."),
    ("Moonblade",
     "An elven moonblade, single-edged slender longsword, silver mirror-polish blade "
     "with faint blue-white inner light along the edge, eldertree-bark grip with "
     "moonstone pommel. Flowing arcane. 3/4 hero angle."),
    # GOBLIN weapons (3)
    ("Poison Shiv",
     "A goblin poison shiv, short rusted blade dripping with viscous green ichor, "
     "swamp-rope bound handle. Crude scavenged feel — rust, swamp-rope, ugly. "
     "Straight-on angle."),
    ("Slingshot",
     "A goblin slingshot, Y-shaped scavenged wood with leather sling pouch holding "
     "a smooth pebble, lucky charms (small bone fragment, copper coin) hanging from "
     "the fork by twine. Scavenged improvised — scrap and luck. 3/4 angle."),
    ("Saw Cutlass",
     "A goblin saw-cutlass, single-edged short sword with serrated saw teeth along "
     "the spine, scrap-metal patchwork blade, rope-wound hilt. Scavenged improvised "
     "— rusty, mismatched. 3/4 hero angle."),
    # DEMON weapons (3)
    ("Hellbrand",
     "A demonic hellbrand, curved greatsword with molten lava cracks running along "
     "the near-black obsidian blade, hilt wrapped in blood-iron chain, faint heat "
     "shimmer around it. Infernal forged — molten cracks, dark obsidian. 3/4 angle."),
    ("Soul Tome",
     "A demonic soul tome — a hovering grimoire bound in dark leather (suggesting "
     "skin but not explicit), pages glowing faintly orange-red, chained shut with "
     "a small iron lock. Infernal forged — dark, brooding. Centred floating composition."),
    ("Pact Dagger",
     "A demonic pact dagger, short obsidian blade with the hilt forged as a clenched "
     "fist of iron, a single drop of blood frozen in mid-fall just below the blade. "
     "Infernal forged — blood-iron, dramatic. Straight-on angle."),
    # DRAKKIN weapons (3)
    ("Drake Claw",
     "A drakkin hand-weapon shaped like a dragon's talon — hollowed drakebone "
     "fingers as the claws, hilt is a leather-wrapped wrist bone, faint heat "
     "shimmer around the bone. Draconic style — scaled handle, hoard-gold accent "
     "at the cuff. 3/4 angle."),
    ("Storm Lance",
     "A drakkin storm lance, long polearm with crackling blue-white lightning "
     "sparking between the tip and the haft, storm-cloud-grey metal shaft with "
     "scaled handle wrap. Draconic — elemental crackle. 3/4 hero angle, dramatic."),
    ("Wyrm Mace",
     "A drakkin wyrm mace, heavy bronze-cast head shaped as a fanged drake skull, "
     "scaled hide-wrapped haft with hoard-gold cuff. Draconic — bronze and bone, "
     "ancient and heavy. Straight-on angle."),
    # DWARF weapons (3)
    ("Forge Hammer",
     "A dwarven forge hammer, a working blacksmith's hammer scaled for war, "
     "square iron head with hammered detail, ash-wood handle, soot-stained. "
     "Mountain-forged — heavy iron, no decoration. Straight-on hero angle."),
    ("Tower Shield",
     "A dwarven tower shield, tall rectangular full-body shield in mountain "
     "iron with a centre boss, deep-vein runes inlaid around the rim glowing "
     "faintly blue. Mountain-forged — heavy, defensive. Straight-on front view."),
    ("Runic Pickaxe",
     "A dwarven runic pickaxe, single-spike pick on a short oak haft, blue runes "
     "inlaid along the spike glowing faintly. The look of a tool that has found "
     "gold AND skulls. Mountain-forged — deep-vein runes, hammered detail. 3/4 angle."),
    # BEASTKIN weapons (3)
    ("Beast Claws",
     "Beastkin bone-claw gauntlets, a pair of wrist-mounted weapons with three "
     "forward-curving bone claws each, hide wrapping at the wrist, dark stains "
     "along the claw edges. Feral primal — bone, sinew, hide-wrap. Paired and "
     "displayed side by side."),
    ("Bone Spear",
     "A beastkin bone spear, a single long spear made entirely from a sharpened "
     "femur with sinew binding at the haft, the head still showing the natural "
     "curve of the bone. Feral primal. 3/4 hero angle."),
    ("Tooth Daggers",
     "Beastkin tooth daggers, twin short blades that are literally large predator "
     "fangs (sabretooth-sized) bound to hide-wrapped handles. Paired and crossed "
     "in display. Feral primal — predator motifs. Top-down angle."),
    # WRAITH weapons (3)
    ("Spirit Blade",
     "A wraith spirit blade, a longsword whose blade is semi-transparent like "
     "glass with a soft astral blue-white inner glow, hilt is dark steel that "
     "seems to phase slightly out of focus. Spectral arcane — phasing edges, "
     "soft astral glow. 3/4 angle, atmospheric."),
    ("Soul Catcher",
     "A wraith soul catcher, curved blade with a hollow glass reservoir set into "
     "the pommel; ghostly wisps of soul-energy can be seen swirling inside the "
     "reservoir. Spectral arcane — astral glow, mystic. 3/4 angle."),
    ("Banshee Staff",
     "A wraith banshee staff, tall staff topped with a screaming spectral face "
     "carved from pale stone, faint blue-grey aura around the head, gnarled black "
     "wood shaft. Spectral arcane — haunting, no obvious maker's marks. Vertical "
     "hero composition."),
    # ARMOR (3, cross-species)
    ("Light Plate",
     "A suit of light plate armor laid out on display in three-quarter view, "
     "segmented lacquered scale, designed for speed not heavy protection, leather "
     "underlayer visible at the joints, slight predator-cat silhouette to the "
     "chest piece. Cross-species — muted browns/blacks/greys with one silver-blue "
     "accent. Display angle."),
    ("Battle Mail",
     "A suit of battle mail laid out on display in three-quarter view, solid chain "
     "mail with a tabard over the chest and a steel breastplate plate, classic "
     "veteran's kit, no species specifics — works for anyone. Cross-species — "
     "neutral metal palette. Display angle."),
    ("Heavy Cuirass",
     "A heavy iron cuirass laid out on display in three-quarter view, full chest "
     "plate plus pauldrons, thick black-iron, designed to be set down rather than "
     "worn lightly. Mountain-forged feel. Cross-species — blacks and dark greys. "
     "Display angle."),
    # TRINKETS (2)
    ("Power Ring",
     "A single ornate ring resting on a small dark velvet pillow, gold band with "
     "a faceted gem set into the bezel, the gem appears to subtly shift colour "
     "(red→blue→green) suggesting the rolled-stat reroll mechanic. Cross-species "
     "— jeweller's display angle, macro shot."),
    ("Lucky Charm",
     "A leather thong with three small lucky charms dangling — a small horseshoe, "
     "a four-leaf clover pressed in glass, a worn copper coin — laid on a clean "
     "surface. The whole thing has a slightly worn, hand-touched look. "
     "Cross-species. Top-down product angle."),
    # BOOTS (1)
    ("Swift Boots",
     "A pair of swift boots set side by side as if for display, calf-high, soft "
     "tan leather with reinforced metal greaves at the shin, light fast-runner "
     "profile, three small wing-feather etchings on the outer ankle. Cross-species "
     "— neutral palette. Product angle."),
    # AURA (1)
    ("Aura of Power",
     "A floating aura orb — a soft palm-sized sphere of golden-white radiance "
     "with faint orbital rings of light slowly circling it, no obvious mechanism, "
     "hovering centred in the frame. Cross-species — painted glow effect, "
     "not photorealistic. Dark background to make the glow read."),
]


# ── Limited potions (5 bespoke pieces) ────────────────────────────
POTIONS = [
    ("Founder's Elixir",
     "An ornate crystal vial centred on a deep-velvet display cushion, viewed at a "
     "slight 3/4 angle. The vial is faceted hand-blown glass, gold-banded at the "
     "cork and base. The liquid inside swirls with all six trait colours layered "
     "in slow spirals — red, green, blue, orange, purple, gold — never mixing, "
     "like a slow-rotating galaxy in glass. Cork is wax-sealed with a small "
     "founder's medallion stamp. Museum-piece presentation, single highlight pass."),
    ("Phoenix Tear",
     "A single elongated teardrop of molten gold-orange liquid suspended inside a "
     "small spherical glass orb on a slender silver stand. Tiny phoenix-feather "
     "motifs etched into the silver stand. The teardrop itself glows from within "
     "with a soft sunset-orange light. A faint wisp of ember-smoke curls upward "
     "from the top of the orb. Jewel-box presentation, dark background to make "
     "the glow read."),
    ("Bond Bloom",
     "A round glass flask shaped like a flower bud, half-open at the top. The "
     "liquid inside is rosy-pink and luminous, with a single floating golden lotus "
     "blossom suspended in the centre. Soft cherry-blossom petals drift slowly "
     "around the exterior of the flask. The stopper is a small carved heart of "
     "rose quartz. Romantic and warm — soft pink and gold palette."),
    ("Stage Skip",
     "A tall hourglass-shaped vial with shimmering silver-and-purple liquid that "
     "appears to flow UPWARDS inside it (defying gravity), giving the impression "
     "of time running backward. The exterior of the vial is etched with twenty "
     "small stage glyphs going up the side, each one glowing faintly more brightly "
     "than the last. Capped with a black-iron lid bearing a single forward-arrow "
     "rune. Time-mystic feel — dark indigo backdrop."),
    ("Whispered Trinket",
     "A small round perfume-bottle-sized vial of pale-silver vapor, viewed at a "
     "slight 3/4 angle. The vapor inside isn't liquid — it visibly drifts and "
     "curls like fog. A tiny pair of stylised lips (carved silver) forms part of "
     "the bottle's pewter cap, suggesting the 'whispering' nature. The base of "
     "the vial bears six tiny stat-glyph charms hanging from a delicate chain. "
     "Ghost-arcane — soft cool greys and silvers."),
]


# ── Metadata blobs (for the metadata.json sidecar) ─────────────────
ITEM_METADATA = {
    "Heavy Axe":        ("Weapon",  "orc",      "Pure damage, no special. Reliable bruiser.", "STR"),
    "War Maul":         ("Weapon",  "orc",      "Crits stun the opponent for 1 round.",       "STR"),
    "Tusked Greatclub": ("Weapon",  "orc",      "25% of attack damage echoes next round.",    "STR"),
    "Longbow":          ("Weapon",  "elf",      "Ignores 25% of opponent armor (anti-tank).", "INT"),
    "Curved Dagger":    ("Weapon",  "elf",      "Twin Strike — second hit at 40% damage.",    "AGI"),
    "Moonblade":        ("Weapon",  "elf",      "Alternates phys/magic damage type each round.", "INT"),
    "Poison Shiv":      ("Weapon",  "goblin",   "Venom — stacking 5% max-HP poison per hit.", "AGI"),
    "Slingshot":        ("Weapon",  "goblin",   "20% independent dodge chance per round.",    "LCK"),
    "Saw Cutlass":      ("Weapon",  "goblin",   "On crit, immediate extra attack at 30%.",    "AGI"),
    "Hellbrand":        ("Weapon",  "demon",    "Magic damage ignores 25% spell resist.",     "INT"),
    "Soul Tome":        ("Weapon",  "demon",    "15% chance per hit to heal 50% of damage.",  "INT"),
    "Pact Dagger":      ("Weapon",  "demon",    "Sacrifice 10% HP for +50% damage (>50% HP).","INT"),
    "Drake Claw":       ("Weapon",  "drakkin",  "Damage is 50% STR + 50% INT.",               "STR"),
    "Storm Lance":      ("Weapon",  "drakkin",  "On crit, second hit auto-fires for 40%.",    "AGI"),
    "Wyrm Mace":        ("Weapon",  "drakkin",  "+5% damage reduction per round survived (cap +20%).", "STR"),
    "Forge Hammer":     ("Weapon",  "dwarf",    "Crits stun for 1 round.",                    "STR"),
    "Tower Shield":     ("Weapon",  "dwarf",    "+20% damage reduction always on. Defensive.","STR"),
    "Runic Pickaxe":    ("Weapon",  "dwarf",    "15% chance per hit: next attack guaranteed crit.", "STR"),
    "Beast Claws":      ("Weapon",  "beastkin", "Frenzy — second hit at 40% damage.",          "STR"),
    "Bone Spear":       ("Weapon",  "beastkin", "+25% crit vs opponents below 50% HP.",        "STR"),
    "Tooth Daggers":    ("Weapon",  "beastkin", "+5% AGI per crit landed (cap +25%).",         "AGI"),
    "Spirit Blade":     ("Weapon",  "wraith",   "20% chance per hit to ignore enemy armor.",   "INT"),
    "Soul Catcher":     ("Weapon",  "wraith",   "On match win, gain +20% all stats next match.","INT"),
    "Banshee Staff":    ("Weapon",  "wraith",   "Round 1: opponent AGI reduced by 30.",        "INT"),
    "Light Plate":      ("Armor",   None,       "+10% dodge chance. Glass-cannon armor.",      "AGI"),
    "Battle Mail":      ("Armor",   None,       "Balanced. The default pick.",                 "VIT"),
    "Heavy Cuirass":    ("Armor",   None,       "+15% damage reduction. Slow, heavy.",         "VIT"),
    "Power Ring":       ("Trinket", None,       "+10% to a random rolled stat (decided at drop).", "rolled"),
    "Lucky Charm":      ("Trinket", None,       "+15% LCK + 10% global proc chance.",          "LCK"),
    "Swift Boots":      ("Boots",   None,       "+initiative bonus, almost always wins ties.", "AGI"),
    "Aura of Power":    ("Aura",    None,       "+5% all stats (Common) up to +20% (Legendary).", "all"),
}

# Supply + PYR price per (slot, rarity), straight from spec §3
SUPPLY = {
    "Weapon":  {"Common": 300, "Rare": 150, "Epic":  50, "Legendary":  10},
    "Armor":   {"Common": 500, "Rare": 200, "Epic":  50, "Legendary":  10},
    "Trinket": {"Common": 400, "Rare": 150, "Epic":  40, "Legendary":   5},
    "Boots":   {"Common": 400, "Rare": 150, "Epic":  40, "Legendary":   5},
    "Aura":    {"Common": 200, "Rare":  80, "Epic":  20, "Legendary":   5},
}
PRICE_PYR = {
    "Weapon":  {"Common":  10, "Rare":  50, "Epic": 200, "Legendary": 1000},
    "Armor":   {"Common":   8, "Rare":  40, "Epic": 150, "Legendary":  750},
    "Trinket": {"Common":  12, "Rare":  60, "Epic": 250, "Legendary": 1250},
    "Boots":   {"Common":   8, "Rare":  40, "Epic": 150, "Legendary":  750},
    "Aura":    {"Common":  20, "Rare": 100, "Epic": 400, "Legendary": 2000},
}

POTION_METADATA = {
    "Founder's Elixir":  (100, 2500, "Permanent +5 to all 6 stats. One-time use per champion. Only available during launch month."),
    "Phoenix Tear":      (200,  800, "Reflects one arena loss this week — that match doesn't count for ELO. Auto-consumes."),
    "Bond Bloom":        (300,  500, "Instant +50 bond on any champion. Skips Stranger / Acquainted tiers entirely."),
    "Stage Skip":         (50, 4000, "Instant +1 stage evolution, ignores level gate. Cannot be used after stage 18."),
    "Whispered Trinket": (100,  600, "Re-rolls a champion's power_ring trinket stat assignment. Champion-bound, single-use."),
}


# ── OpenAI client ──────────────────────────────────────────────────
_client = None
def client():
    global _client
    if _client is None: _client = OpenAI()
    return _client


def gen_one(title: str, concept: str, out_path: Path, model: str,
            force: bool) -> tuple[str, bool, float, str]:
    if out_path.exists() and not force:
        return (out_path.name, False, 0.0, "skipped (exists)")
    prompt = concept + " " + STYLE
    t0 = time.time()
    try:
        r = client().images.generate(
            model=model, prompt=prompt, size="1024x1024",
            quality="high", n=1,
        )
        img_b64 = r.data[0].b64_json
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_bytes(base64.b64decode(img_b64))
        return (out_path.name, True, time.time() - t0,
                f"{out_path.stat().st_size // 1024} KB")
    except Exception as e:
        return (out_path.name, False, time.time() - t0, f"FAIL: {e}")


def build_metadata() -> dict:
    """Combined metadata.json for the whole drop. Farhan uses this with
    his mint contract — title, supply per rarity tier, PYR price per
    rarity tier, primary stat, species lock, mechanic description."""
    meta = {
        "_generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "_source_spec": "~/Desktop/Champions_NFT_FINAL_Spec.md",
        "_note": "Filenames in the Equipment/ + Limited Potions/ folders "
                 "match each NFT's on-chain title exactly. For Equipment, "
                 "ONE image covers all 4 rarities — rarity is rendered as "
                 "a coloured border in the game UI, not in the art.",
        "equipment": [],
        "limited_potions": [],
    }
    for title, (slot, species, mech, stat) in ITEM_METADATA.items():
        meta["equipment"].append({
            "title": title,
            "filename": f"Equipment/{title}.png",
            "slot": slot,
            "species_lock": species,
            "primary_stat": stat,
            "mechanic": mech,
            "rarities": {
                rar: {
                    "supply": SUPPLY[slot][rar],
                    "pyr_price": PRICE_PYR[slot][rar],
                    "shop_bucket": SUPPLY[slot][rar] // 2,
                    "ecosystem_bucket": SUPPLY[slot][rar] - SUPPLY[slot][rar] // 2,
                    "sale_model": ("Pattern B — lazy-mint on purchase"
                                   if rar == "Legendary"
                                   else "Pattern A — pre-mint to escrow"),
                }
                for rar in ("Common", "Rare", "Epic", "Legendary")
            },
            "per_item_total": sum(SUPPLY[slot][r] for r in ("Common","Rare","Epic","Legendary")),
        })
    for title, (ed, price, effect) in POTION_METADATA.items():
        meta["limited_potions"].append({
            "title": title,
            "filename": f"Limited Potions/{title}.png",
            "editions": ed,
            "pyr_price": price,
            "effect": effect,
            "shop_bucket": ed // 2,
            "ecosystem_bucket": ed - ed // 2,
            "sale_model": "Pattern A — pre-mint to escrow",
            "season": "Season 1 launch — never reissued",
        })
    # Totals
    eq_total = sum(item["per_item_total"] for item in meta["equipment"])
    lp_total = sum(p["editions"] for p in meta["limited_potions"])
    meta["totals"] = {
        "equipment_skus": len(meta["equipment"]) * 4,  # 31 items × 4 rarities
        "equipment_editions": eq_total,
        "limited_potion_skus": len(meta["limited_potions"]),
        "limited_potion_editions": lp_total,
        "grand_total_nfts": eq_total + lp_total,
    }
    return meta


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=("equipment", "potions"),
                    help="generate only one category")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--model", default="gpt-image-1.5")
    ap.add_argument("--force", action="store_true",
                    help="regenerate even if file exists")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    queue: list[tuple[str, str, Path]] = []
    if args.only != "potions":
        for title, concept in EQUIPMENT:
            queue.append((title, concept, EQUIP_DIR / f"{title}.png"))
    if args.only != "equipment":
        for title, concept in POTIONS:
            queue.append((title, concept, POTION_DIR / f"{title}.png"))

    # Filter resume
    if not args.force:
        queue = [q for q in queue if not q[2].exists()]

    print(f"Output: {DEST}")
    print(f"Queue:  {len(queue)} images "
          f"(model={args.model}, workers={args.workers})")
    if args.dry_run:
        for title, concept, path in queue[:50]:
            print(f"  would gen: {path.relative_to(DEST)}")
            print(f"             {concept[:100]}…")
        return 0

    if queue:
        ok = fail = 0
        t_start = time.time()
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futures = {ex.submit(gen_one, t, c, p, args.model, args.force): (t, p)
                       for t, c, p in queue}
            for fut in as_completed(futures):
                name, success, elapsed, detail = fut.result()
                tag = "✓ " if success else ("· " if "skipped" in detail else "✗ ")
                if success: ok += 1
                elif "skipped" not in detail: fail += 1
                print(f"{tag}{name:36s}  {elapsed:5.1f}s  {detail}", flush=True)
        total = time.time() - t_start
        print(f"\n=== Done: {ok} generated, {fail} failed, total {total/60:.1f} min ===")
    else:
        print("Nothing to do — every image already exists. Use --force to regenerate.")

    # Always (re)write metadata
    meta = build_metadata()
    (DEST / "metadata.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"\nMetadata written → {DEST / 'metadata.json'}")
    print(f"  {meta['totals']['equipment_skus']} equipment SKUs, "
          f"{meta['totals']['equipment_editions']:,} editions")
    print(f"  {meta['totals']['limited_potion_skus']} limited potion SKUs, "
          f"{meta['totals']['limited_potion_editions']:,} editions")
    print(f"  GRAND TOTAL: {meta['totals']['grand_total_nfts']:,} NFTs ready to mint")
    return 0


if __name__ == "__main__":
    sys.exit(main())
