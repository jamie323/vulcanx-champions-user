#!/usr/bin/env python3
"""
gen_potion_art.py — trait-potion + quest-chest art, SAME style family as the
equipment set (imports STYLE from gen_nft_item_images.py so the shop tiles
read as one collection — Dizzydreamer: "potions still look different from
the equipment and limited drops").

One image per BASE potion (tier = UI frame glow, like equipment rarity).
Output: nft_images/potions/<key>.png in the repo (served by the app).

Usage:
    python3 scripts/gen_potion_art.py            # generate missing
    python3 scripts/gen_potion_art.py --force    # regenerate all
"""
from __future__ import annotations

import argparse, base64, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from gen_nft_item_images import STYLE, client  # reuse style lock + API client

DEST = Path(__file__).resolve().parent.parent / "nft_images" / "potions"

BOTTLE = ("A round-bellied glass potion bottle with a wax-sealed cork stopper, "
          "leather cord wound around the neck, ")

POTIONS = [
    ("trait_str", BOTTLE + "filled with luminous crimson-red liquid that glows from "
     "within, a tiny iron fist charm hanging from the neck cord. Centred product shot."),
    ("trait_vit", BOTTLE + "filled with luminous emerald-green liquid that glows from "
     "within, a tiny carved heart charm hanging from the neck cord. Centred product shot."),
    ("trait_agi", BOTTLE + "filled with luminous cyan-blue liquid that glows from "
     "within, a tiny silver feather charm hanging from the neck cord. Centred product shot."),
    ("trait_fer", BOTTLE + "filled with luminous fiery-orange liquid that glows from "
     "within, a tiny beast-fang charm hanging from the neck cord. Centred product shot."),
    ("trait_int", BOTTLE + "filled with luminous violet liquid that glows from "
     "within, a tiny rune-etched stone charm hanging from the neck cord. Centred product shot."),
    ("trait_lck", BOTTLE + "filled with luminous golden liquid that glows from "
     "within, a tiny four-leaf-clover charm hanging from the neck cord. Centred product shot."),
    ("special_evolution", "An ornate amber-gold evolution elixir in a tall spiralled "
     "glass vial, a miniature lightning storm swirling inside the liquid, brass "
     "fittings at neck and base. Centred product shot."),
    ("special_blessing", "A sacred blessing elixir in an ornate crystal decanter, "
     "violet-white starlight liquid with tiny motes of light rising inside, thin "
     "gold filigree over the glass. Centred product shot."),
    ("special_healing", "A healer's salve in a small round clay pot with a cork lid "
     "half-open showing rose-pink balm inside, a rolled linen bandage leaning "
     "against the pot. Centred product shot."),
    ("quest_chest", "An ornate fantasy treasure chest, dark ironwood banded with "
     "engraved gold, lid open a hand's width with warm golden light spilling out, "
     "a few gold coins at the base. Centred product shot, slight 3/4 angle."),
]


def gen_one(key: str, concept: str, model: str, force: bool) -> str:
    out = DEST / f"{key}.png"
    if out.exists() and not force:
        return f"skip {key} (exists)"
    prompt = f"{concept}\n\n{STYLE}"
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
        futs = [ex.submit(gen_one, k, c, args.model, args.force) for k, c in POTIONS]
        for f in as_completed(futs):
            print(f.result(), flush=True)


if __name__ == "__main__":
    main()
