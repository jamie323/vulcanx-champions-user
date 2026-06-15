#!/usr/bin/env python3
"""
gen_ui_icons.py — painted game-icon set for the Champions UI.

Dizzydreamer: "Strong icons, consistent item assets, clearer visual
hierarchy... players should understand actions through visuals." Same art
family as the equipment/potion set, but emblem-style icons that read at
24-32px (trait stats, stance buttons, energy, currency).

Output: nft_images/icons/<key>.png

Usage:
    python3 scripts/gen_ui_icons.py            # generate missing
    python3 scripts/gen_ui_icons.py --force
"""
from __future__ import annotations

import argparse, base64, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from gen_nft_item_images import client  # same API client / key handling

DEST = Path(__file__).resolve().parent.parent / "nft_images" / "icons"

# Icon-specific style lock — same painted family, but emblem composition
# tuned to stay legible when shrunk to 24px.
ICON_STYLE = (
    "Painted-3D game icon, single bold emblem centred on a transparent "
    "background, chunky silhouette with thick readable shapes, painterly "
    "rim-light from upper-left, one strong accent colour, subtle dark "
    "outer glow for contrast on dark UI. Must stay clearly readable when "
    "shrunk to 24 pixels — no fine detail, no thin lines, no text, no "
    "border, no UI chrome. Style matches the VulcanX Champions painted "
    "item-art set (gpt-image-1.5). Square composition, emblem fills ~80% "
    "of frame."
)

ICONS = [
    # Trait emblems (replace 💪❤️🏃⚔️🧠🍀)
    ("trait_str", "An iron gauntlet clenched into a fist, crimson-red metal glow at the knuckles. Strength emblem."),
    ("trait_vit", "A faceted ruby heart with a soft emerald-green inner glow at its core. Vitality emblem."),
    ("trait_agi", "A winged leather boot, cyan wind-streak trailing behind it. Agility emblem."),
    ("trait_fer", "A snarling beast jaw with bared fangs, fiery orange glow between the teeth. Ferocity emblem."),
    ("trait_int", "An arcane all-seeing eye inside a rune circle, violet glow. Intelligence emblem."),
    ("trait_lck", "A golden four-leaf clover charm on a small ring, warm gold sparkle. Luck emblem."),
    # Stance crests (replace ⚔️⚖️🛡️)
    ("stance_aggressive", "Two crossed battle swords over a small flame, red-orange accent. Aggressive battle stance crest."),
    ("stance_balanced", "A bronze balance scale, perfectly level pans, warm gold accent. Balanced battle stance crest."),
    ("stance_defensive", "A stout tower shield with riveted iron bands, steel-blue accent. Defensive battle stance crest."),
    # Resource icons
    ("energy", "A jagged lightning bolt carved from glowing amber crystal. Energy emblem."),
    ("pyr_coin", "A thick gold coin embossed with a stylised flame, ember-orange rim light. PYR currency coin."),
    # ── Unification pass (Dizzydreamer/AngelHorn 15 Jun): painted assets to
    #    replace the recurring functional emoji across the app. Same emblem
    #    family so the whole UI reads as one set. ──
    ("blessing",  "A radiant golden eight-pointed star burst with a glowing white core and divine sparkle. Blessing emblem."),
    ("potion",    "A rounded glass potion flask with glowing teal liquid, a cork stopper, and a soft bubble highlight. Potion emblem."),
    ("trophy",    "A golden two-handled victory chalice trophy on a small base with a warm gold gleam. Ranks/leaderboard emblem."),
    ("fire",      "A stylised orange-red flame with a bright yellow-white core. Fire emblem."),
    ("heal",      "A white medical cross over a folded bandage with a soft emerald-green heal glow. Healing emblem."),
    ("map",       "A rolled-open treasure-map parchment with a dotted route and a red X, warm amber tone. Adventures map emblem."),
    ("egg",       "A speckled dragon egg resting in a small twig nest with a soft warm rim light. Adopt/hatch emblem."),
    ("hourglass", "An ornate brass hourglass with glowing amber sand falling through it. Time/duration emblem."),
    ("shop",      "A merchant's market-stall awning over a leather coin pouch with a single gold coin, warm tone. Shop emblem."),
    ("target",    "A red-and-white concentric archery target with an arrow struck in the bullseye. Challenge emblem."),
    ("chest",     "A closed ornate wooden treasure chest with gold iron bands and a lock, faint gold glow from the lid seam. Reward chest emblem."),
    ("book",      "An open leather-bound spellbook with a faint glowing rune on the page and gilded edges. Guide emblem."),
    ("crown",     "A golden royal crown set with red gems, rim-lit. Legendary/royalty emblem."),
]


def gen_one(key: str, concept: str, model: str, force: bool) -> str:
    out = DEST / f"{key}.png"
    if out.exists() and not force:
        return f"skip {key}"
    prompt = f"{concept}\n\n{ICON_STYLE}"
    for attempt in range(3):
        try:
            r = client().images.generate(
                model=model, prompt=prompt, size="1024x1024",
                quality="high", n=1,
            )
            out.write_bytes(base64.b64decode(r.data[0].b64_json))
            return f"OK   {key} ({out.stat().st_size//1024}KB)"
        except Exception as e:  # noqa: BLE001
            if attempt == 2:
                return f"FAIL {key}: {e}"
            time.sleep(4 * (attempt + 1))
    return f"FAIL {key}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--model", default="gpt-image-1.5")
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()

    DEST.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = [ex.submit(gen_one, k, c, args.model, args.force) for k, c in ICONS]
        for f in as_completed(futs):
            print(f.result(), flush=True)


if __name__ == "__main__":
    main()
