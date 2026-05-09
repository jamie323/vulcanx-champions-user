#!/usr/bin/env python3
"""
gen_all_bloodlines_v2.py — fixed orchestrator after the v1 disaster.

What v1 got wrong:
  - One generic --extra-prompt for all 23 bloodlines, none of which
    triggered phase22's _skin_color_for_prompt() override keywords.
    Result: every elf, dwarf, drakkin, beastkin, and wraith was
    generated with the hardcoded DEFAULT_SKIN ("bright green-mossy
    orc skin") and came out as a green orc warrior.
  - "World of Warcraft" + "Unreal Engine 5" in the extra-prompt got
    rendered as gibberish brand-name watermarks across many images.

What v2 fixes:
  - Per-bloodline skin keyword (BLUE / GOLDEN / WHITE / BLACK / RED /
    PURPLE) prepended to the extra-prompt for that bloodline so
    _skin_color_for_prompt() returns the correct override and Flux
    paints the right palette instead of green-orc default.
  - Stripped "World of Warcraft", "Unreal Engine 5", "trailer-grade
    key-art" — anything that's a known brand string the model might
    render literally. Replaced with neutral descriptors.
  - Explicit "no watermarks, no logos, no text, no brand names"
    negative pushed via the extra-prompt.
  - Concurrency dropped 4 → 2 to stay under Replicate's 6-rpm throttle.

Usage:
    python3 scripts/gen_all_bloodlines_v2.py
"""
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

POC = Path("/Users/jamiethomson/VulcanX-Avatar-PoC")
PIPELINE = POC / "phase22_twenty_stage_chain.py"
SRC = POC / "evolution_v2"
DEST_BASE = Path("/Users/jamiethomson/vulcanx-champions-user/allbloodlines")
LOGDIR = Path("/tmp/allbloodlines_logs_v2")
LOGDIR.mkdir(exist_ok=True)

# Style nudge — focused on rendering quality, with brand-safe wording.
# No "World of Warcraft", no "Unreal Engine 5", no "trailer-grade
# key-art" — those triggered the watermark/logo gibberish in v1.
COMMON_STYLE = (
    "semi-photoreal painted fantasy character art, painterly brushwork, "
    "oil-painting-over-photograph rendering, dramatic chiaroscuro "
    "lighting, atmospheric depth, ornate weathered armour, ritual "
    "tribal detail, intricate beadwork charms feathers and bone, "
    "atmospheric particles like embers smoke mist dust, dark moody "
    "cinematic key-light, no watermarks no logos no text no brand "
    "names visible in the image, plain unmarked backdrop"
)

# (species, bloodline_id, folder_name, skin_keyword)
# skin_keyword must be one phase22 already recognises in _skin_color_for_prompt():
#   BLUE SKIN / RED SKIN / PURPLE SKIN / BLACK SKIN / WHITE SKIN /
#   YELLOW SKIN / GOLDEN SKIN / DEEP SAPPHIRE BLUE / DEEP CRIMSON RED
# Picking the closest match to each bloodline's skin DNA in species_library.py.
BLOODLINES = [
    # Orcs
    ("orc",      "ashclan",     "Ashclan",     "WHITE SKIN"),       # ash-grey
    ("orc",      "bloodfang",   "Bloodfang",   "DEEP CRIMSON RED"), # rust-red
    # Elves
    ("elf",      "moonsong",    "Moonsong",    "WHITE SKIN"),       # pale alabaster
    ("elf",      "sunweaver",   "Sunweaver",   "GOLDEN SKIN"),      # golden-bronze
    ("elf",      "nightshade",  "Nightshade",  "WHITE SKIN"),       # very pale alabaster
    # Goblins (default green is fine for these — but pin it anyway to be safe)
    ("goblin",   "irontooth",   "IronTooth",   ""),                 # mustard-green (default OK)
    ("goblin",   "swampskin",   "Swampskin",   ""),                 # swamp-green (default OK)
    ("goblin",   "emberskin",   "Emberskin",   "WHITE SKIN"),       # ash-grey w/ ember cracks
    # Demons
    ("demon",    "infernal",    "Infernal",    "BLACK SKIN"),       # dark ash-grey
    ("demon",    "voidborn",    "Voidborn",    "BLACK SKIN"),       # near-black w/ purple
    ("demon",    "ichorskin",   "Ichorskin",   "WHITE SKIN"),       # pale chalk-grey
    # Drakkin
    ("drakkin",  "emberscale",  "Emberscale",  "GOLDEN SKIN"),      # bronze-tan w/ red scales
    ("drakkin",  "frostscale",  "Frostscale",  "WHITE SKIN"),       # pale alabaster w/ ice scales
    ("drakkin",  "stormscale",  "Stormscale",  "BLUE SKIN"),        # slate-grey w/ blue scales
    # Dwarves
    ("dwarf",    "ironbeard",   "Ironbeard",   "GOLDEN SKIN"),      # ruddy sun-tanned
    ("dwarf",    "stonehammer", "Stonehammer", "WHITE SKIN"),       # pale stone-grey
    ("dwarf",    "goldseeker",  "Goldseeker",  "GOLDEN SKIN"),      # ruddy tan
    # Beastkin
    ("beastkin", "wolfkin",     "Wolfkin",     "WHITE SKIN"),       # human-toned w/ silver fur
    ("beastkin", "pantherkin",  "Pantherkin",  "WHITE SKIN"),       # human-toned w/ black fur
    ("beastkin", "bearkin",     "Bearkin",     "GOLDEN SKIN"),      # ruddy w/ brown fur
    # Wraiths
    ("wraith",   "mourner",     "Skyweaver",   "BLUE SKIN"),        # silver-blue translucent
    ("wraith",   "voidstalker", "Voidstalker", "PURPLE SKIN"),      # dark-purple translucent
    ("wraith",   "sunspire",    "Sunspire",    "GOLDEN SKIN"),      # warm-golden translucent
]


def extra_prompt_for(skin_keyword: str) -> str:
    skin_part = f"{skin_keyword}. " if skin_keyword else ""
    return f"{skin_part}{COMMON_STYLE}"


def copy_outputs(sp: str, bl: str, name: str) -> int:
    target = DEST_BASE / name
    target.mkdir(parents=True, exist_ok=True)
    copied = 0
    for src in sorted(SRC.glob(f"{sp}_{bl}_s*.png")):
        rel = src.stem.replace(f"{sp}_{bl}_", "")
        shutil.copy2(src, target / f"{rel}.png")
        copied += 1
    return copied


def run_one(sp: str, bl: str, name: str, skin: str) -> tuple[str, str, int, int, int]:
    log = LOGDIR / f"{sp}_{bl}.log"
    extra = extra_prompt_for(skin)
    t0 = time.time()
    with log.open("w") as f:
        f.write(f"=== v2 batch: {sp}/{bl} → {name}  (skin: {skin or 'default'}) ===\n")
        f.flush()
        result = subprocess.run(
            ["python3", str(PIPELINE), sp, bl, "--fresh",
             "--extra-prompt", extra],
            cwd=str(POC), stdout=f, stderr=subprocess.STDOUT,
        )
    rc = result.returncode
    copied = copy_outputs(sp, bl, name)
    return (sp, bl, rc, copied, int(time.time() - t0))


def main() -> int:
    DEST_BASE.mkdir(exist_ok=True)
    print(f"=== v2 batch: {len(BLOODLINES)} bloodlines, concurrency 2 ===")
    print(f"output: {DEST_BASE}")
    print(f"logs:   {LOGDIR}")
    print()
    for sp, bl, name, skin in BLOODLINES:
        print(f"  {name:<13s}  skin={skin or 'default-green'}")
    print()

    ok = 0
    fail = 0
    with ThreadPoolExecutor(max_workers=2) as ex:
        futures = {ex.submit(run_one, *bl): bl for bl in BLOODLINES}
        for fut in as_completed(futures):
            sp, bl, rc, copied, elapsed = fut.result()
            tag = "OK  " if rc == 0 and copied == 20 else "FAIL"
            if tag == "OK  ":
                ok += 1
            else:
                fail += 1
            print(f"[{tag}] {sp}/{bl:<11s}  copied {copied:>2d}/20  "
                  f"({elapsed}s)  log: /tmp/allbloodlines_logs_v2/{sp}_{bl}.log",
                  flush=True)

    print()
    print(f"=== v2 done: {ok} ok, {fail} failed ===")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
