#!/usr/bin/env python3
"""
slot_bloodlines.py — copy the 24 finished gpt-image-2 bloodline sets
from ~/Desktop/VulcanX_Bloodlines/<Folder>/sNN_StageName.png into the
two consuming locations:

  1. ~/VulcanX-Avatar-PoC/evolution_v2/<sp>_<bl>_sNN_StageName.png
     (flat — read by art_studio.py for review/iteration UI)
  2. ~/vulcanx-champions-user/evolution20/<species>/<bloodline>/sNN.png
     (nested — read by the live in-app champion view)

Both naming conventions are different; this script handles the renames.
Idempotent: existing destinations are overwritten (the new images
are uniformly better quality than what was there before).

Usage:
    python3 scripts/slot_bloodlines.py            # dry-run unless --apply
    python3 scripts/slot_bloodlines.py --apply
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

SRC = Path.home() / "Desktop" / "VulcanX_Bloodlines"
STUDIO_DEST = Path.home() / "VulcanX-Avatar-PoC" / "evolution_v2"
GAME_DEST = Path.home() / "vulcanx-champions-user" / "evolution20"
APPROVAL_FILE = Path.home() / "VulcanX-Avatar-PoC" / "bloodline_approval.json"


def _load_approvals() -> dict:
    """Read the art studio's approval manifest. Returns {} if missing."""
    if not APPROVAL_FILE.exists():
        return {}
    try:
        return json.loads(APPROVAL_FILE.read_text())
    except Exception:
        return {}


def _is_approved(approvals: dict, species: str, bloodline: str) -> bool:
    return approvals.get(f"{species}/{bloodline}", {}).get("approved", False)

# Desktop folder name -> (species_id, bloodline_id)
# The mismatches: Iron-Tooth -> goblin/irontooth (hyphen vs no-hyphen),
# Skyweaver -> wraith/mourner (legacy bloodline id keeps "mourner").
BLOODLINE_MAP = {
    "Ashclan":       ("orc",      "ashclan"),
    "Bearkin":       ("beastkin", "bearkin"),
    "Bloodfang":     ("orc",      "bloodfang"),
    # Added 2026-05-18: 2 new orc bloodlines repurposing earlier-gen
    # Ironfang art so nothing's wasted. Maps Desktop folder → bloodline.
    "Tuskborn":      ("orc",      "tuskborn"),
    "Dreadclaw":     ("orc",      "dreadclaw"),
    "Emberscale":    ("drakkin",  "emberscale"),
    "Emberskin":     ("goblin",   "emberskin"),
    "Frostscale":    ("drakkin",  "frostscale"),
    "Goldseeker":    ("dwarf",    "goldseeker"),
    "Ichorskin":     ("demon",    "ichorskin"),
    "Infernal":      ("demon",    "infernal"),
    "Iron-Tooth":    ("goblin",   "irontooth"),
    "Ironbeard":     ("dwarf",    "ironbeard"),
    "Ironfang":      ("orc",      "ironfang"),
    "Moonsong":      ("elf",      "moonsong"),
    "Nightshade":    ("elf",      "nightshade"),
    "Pantherkin":    ("beastkin", "pantherkin"),
    "Skyweaver":     ("wraith",   "mourner"),
    "Stonehammer":   ("dwarf",    "stonehammer"),
    "Stormscale":    ("drakkin",  "stormscale"),
    "Sunspire":      ("wraith",   "sunspire"),
    "Sunweaver":     ("elf",      "sunweaver"),
    "Swampskin":     ("goblin",   "swampskin"),
    "Voidborn":      ("demon",    "voidborn"),
    "Voidstalker":   ("wraith",   "voidstalker"),
    "Wolfkin":       ("beastkin", "wolfkin"),
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true",
                    help="Perform the copy. Default is dry-run.")
    args = ap.parse_args()

    if not SRC.exists():
        print(f"ERROR: source dir not found: {SRC}")
        return 1

    STUDIO_DEST.mkdir(parents=True, exist_ok=True)
    approvals = _load_approvals()

    summary = {"studio": 0, "game": 0, "skipped_locked": 0,
               "skipped": 0, "missing_src": 0}
    plan: list[tuple[Path, Path, str]] = []
    locked_skips: list[str] = []

    for folder, (sp, bl) in sorted(BLOODLINE_MAP.items()):
        # Mint-lock guard: if a bloodline has been approved in the studio,
        # its canonical NFT art is frozen. Refuse to overwrite either the
        # studio working copy or the in-app game tree.
        if _is_approved(approvals, sp, bl):
            locked_skips.append(f"{sp}/{bl}")
            summary["skipped_locked"] += 1
            continue

        src_dir = SRC / folder
        if not src_dir.is_dir():
            print(f"⚠  missing source folder: {folder}")
            summary["missing_src"] += 1
            continue

        # Iterate the 20 stage files
        stages = sorted(src_dir.glob("s*_*.png"))
        if not stages:
            print(f"⚠  no images in {folder}/")
            summary["missing_src"] += 1
            continue

        game_dir = GAME_DEST / sp / bl
        for src_png in stages:
            # filename: s05_Youngling.png
            name = src_png.name
            # destination 1: studio flat with prefix
            studio_path = STUDIO_DEST / f"{sp}_{bl}_{name}"
            # destination 2: game nested, stripped to s05.png
            stage_idx = name.split("_", 1)[0]   # 's05'
            game_path = game_dir / f"{stage_idx}.png"
            plan.append((src_png, studio_path, "studio"))
            plan.append((src_png, game_path,   "game"))

    if locked_skips:
        print(f"🔒 Skipped {len(locked_skips)} mint-locked bloodline(s): "
              f"{', '.join(locked_skips)}")
        print(f"   (To overwrite, unlock first in the art studio: "
              f"http://localhost:7777)")
    print(f"Plan: {len(plan)} copies "
          f"({len(plan)//2} game + {len(plan)//2} studio) "
          f"from {len(BLOODLINE_MAP) - len(locked_skips)} unlocked bloodlines")
    if not args.apply:
        # Show 6 example mappings then bail
        for src, dst, tag in plan[:6]:
            print(f"  [{tag}] {src.relative_to(Path.home())}\n           → {dst.relative_to(Path.home())}")
        print(f"  ... + {len(plan) - 6} more")
        print("\nDry-run only. Re-run with --apply to actually copy.")
        return 0

    for src, dst, tag in plan:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        summary[tag] += 1

    print(f"\n=== Done: {summary['studio']} studio + {summary['game']} game files written ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
