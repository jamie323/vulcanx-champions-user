#!/usr/bin/env python3
"""
fixup_young_stages.py — re-generates s01–s05 for the 20 v2 bloodlines that
came out off-species at the young stages.

Why: phase22's young-stage prompt template uses generic "TINY CHIBI BABY
fantasy creature with pointed ears" wording plus the bloodline skin colour.
For default-green bloodlines (orc/goblin) the model anchors correctly on
"baby orc/troll" priors. For non-green bloodlines (elf/demon/drakkin/
dwarf/beastkin/wraith), losing the green orc anchor lets the model wander
to whatever pale fantasy baby it likes — Ashclan came out as a fluffy
white-furred kitten, etc.

Fix: pass --redo 1,2,3,4,5 with an extra-prompt that explicitly names
the species ("baby ORC with prominent tusks and brow ridge") so the
species cue beats the generic "fantasy creature" framing.

Skipping:
  - IronTooth + Swampskin (default-green goblins came out fine)
  - Bloodfang (parked — NSFW filter blocks adult anchors)

20 bloodlines × 5 stages × ~$0.04 Kontext per stage = ~$4.

Usage:
    python3 scripts/fixup_young_stages.py
"""
import shutil
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

POC = Path("/Users/jamiethomson/VulcanX-Avatar-PoC")
PIPELINE = POC / "phase22_twenty_stage_chain.py"
SRC = POC / "evolution_v2"
DEST_BASE = Path("/Users/jamiethomson/vulcanx-champions-user/allbloodlines")
LOGDIR = Path("/tmp/allbloodlines_fixup_logs")
LOGDIR.mkdir(exist_ok=True)

COMMON_STYLE = (
    "semi-photoreal painted fantasy character art, painterly brushwork, "
    "oil-painting-over-photograph rendering, dramatic chiaroscuro "
    "lighting, no watermarks no logos no text no brand names visible "
    "in the image, plain unmarked backdrop"
)

# Per-species baby cue. The young-stage template in phase22 uses
# "TINY CHIBI BABY fantasy creature with pointed ears" — these cues
# pin the species so the model doesn't drift into kittens / pups.
SPECIES_BABY = {
    "orc":      "baby ORC with prominent tusks, heavy brow ridge, mossy-green-grey skin, fantasy orc baby",
    "elf":      "baby ELF with long pointed ears and delicate elven features, fantasy elf baby",
    "goblin":   "baby GOBLIN with bat-like pointed ears and small pointed teeth, fantasy goblin baby",
    "demon":    "baby DEMON with small horns and otherworldly features, fantasy demon baby",
    "drakkin":  "baby DRAKKIN with small dragon scales on jaw and forearms, slit-pupil dragon eyes, fantasy dragonkin baby",
    "dwarf":    "baby DWARF with stout features, broad nose, large head, fantasy dwarf baby",
    "beastkin": "baby BEASTKIN with animal ears on top of the head and small fur patches on forearms, fantasy beastkin baby",
    "wraith":   "baby WRAITH spirit with translucent ethereal features and softly glowing eyes, fantasy spirit-wraith baby",
}

# (species, bloodline_id, folder_name, skin_keyword)
# Excludes: orc/ironfang (already shipped), orc/bloodfang (parked),
# goblin/irontooth + goblin/swampskin (default-green babies are fine).
BLOODLINES = [
    ("orc",      "ashclan",     "Ashclan",     "WHITE SKIN"),
    ("elf",      "moonsong",    "Moonsong",    "WHITE SKIN"),
    ("elf",      "sunweaver",   "Sunweaver",   "GOLDEN SKIN"),
    ("elf",      "nightshade",  "Nightshade",  "WHITE SKIN"),
    ("goblin",   "emberskin",   "Emberskin",   "WHITE SKIN"),
    ("demon",    "infernal",    "Infernal",    "BLACK SKIN"),
    ("demon",    "voidborn",    "Voidborn",    "BLACK SKIN"),
    ("demon",    "ichorskin",   "Ichorskin",   "WHITE SKIN"),
    ("drakkin",  "emberscale",  "Emberscale",  "GOLDEN SKIN"),
    ("drakkin",  "frostscale",  "Frostscale",  "WHITE SKIN"),
    ("drakkin",  "stormscale",  "Stormscale",  "BLUE SKIN"),
    ("dwarf",    "ironbeard",   "Ironbeard",   "GOLDEN SKIN"),
    ("dwarf",    "stonehammer", "Stonehammer", "WHITE SKIN"),
    ("dwarf",    "goldseeker",  "Goldseeker",  "GOLDEN SKIN"),
    ("beastkin", "wolfkin",     "Wolfkin",     "WHITE SKIN"),
    ("beastkin", "pantherkin",  "Pantherkin",  "WHITE SKIN"),
    ("beastkin", "bearkin",     "Bearkin",     "GOLDEN SKIN"),
    ("wraith",   "mourner",     "Skyweaver",   "BLUE SKIN"),
    ("wraith",   "voidstalker", "Voidstalker", "PURPLE SKIN"),
    ("wraith",   "sunspire",    "Sunspire",    "GOLDEN SKIN"),
]

YOUNG_STAGES = "1,2,3,4,5"


def extra_prompt_for(sp: str, skin: str) -> str:
    species_cue = SPECIES_BABY[sp]
    return f"{skin}. {species_cue}. {COMMON_STYLE}"


def copy_outputs(sp: str, bl: str, name: str) -> int:
    """Copy s01..s05 from evolution_v2 → allbloodlines/<name>/. Only the
    young stages — leave existing s06..s20 untouched."""
    target = DEST_BASE / name
    target.mkdir(parents=True, exist_ok=True)
    copied = 0
    for stage in range(1, 6):
        for src in SRC.glob(f"{sp}_{bl}_s{stage:02d}_*.png"):
            rel = src.stem.replace(f"{sp}_{bl}_", "")
            shutil.copy2(src, target / f"{rel}.png")
            copied += 1
    return copied


def run_one(sp: str, bl: str, name: str, skin: str) -> tuple[str, str, int, int]:
    log = LOGDIR / f"{sp}_{bl}.log"
    extra = extra_prompt_for(sp, skin)
    t0 = time.time()
    with log.open("w") as f:
        f.write(f"=== fixup s01-s05: {sp}/{bl} → {name}  (skin: {skin}) ===\n")
        f.write(f"extra: {extra}\n\n")
        f.flush()
        result = subprocess.run(
            ["python3", str(PIPELINE), sp, bl,
             "--redo", YOUNG_STAGES,
             "--extra-prompt", extra],
            cwd=str(POC), stdout=f, stderr=subprocess.STDOUT,
        )
    rc = result.returncode
    copied = copy_outputs(sp, bl, name)
    return (sp, bl, rc, copied, int(time.time() - t0))


def main() -> int:
    print(f"=== young-stage fixup: {len(BLOODLINES)} bloodlines × 5 stages ===")
    print(f"output: {DEST_BASE}/<Name>/s01..s05.png")
    print(f"logs:   {LOGDIR}")
    print(f"concurrency: 2")
    print()

    ok = 0
    fail = 0
    with ThreadPoolExecutor(max_workers=2) as ex:
        futures = {ex.submit(run_one, *bl): bl for bl in BLOODLINES}
        for fut in as_completed(futures):
            sp, bl, rc, copied, elapsed = fut.result()
            tag = "OK  " if rc == 0 and copied >= 5 else "FAIL"
            if tag == "OK  ":
                ok += 1
            else:
                fail += 1
            print(f"[{tag}] {sp}/{bl:<11s}  copied {copied:>2d}  ({elapsed}s)",
                  flush=True)

    print()
    print(f"=== fixup done: {ok} ok, {fail} failed ===")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
