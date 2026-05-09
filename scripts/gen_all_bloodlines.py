#!/usr/bin/env python3
"""
gen_all_bloodlines.py — orchestrator for the 23-bloodline batch generation.

Runs phase22_twenty_stage_chain.py for every bloodline that isn't already
fully shipped (orc/ironfang is the only complete one, so 23 to go), with
a Warcraft-cinematic extra-prompt nudge for extra ornamental detail to
match the level of the latest Ashclan reference set.

After each bloodline finishes, copies the 20 PNGs from evolution_v2/ into
~/vulcanx-champions-user/allbloodlines/<Bloodline>/sNN_StageName.png
ready for review.

Concurrency: 4 in parallel. ~10–12 min wall per bloodline; total ~50–60 min.
Cost: ~$0.90 each on Replicate (Flux Ultra anchors + Kontext fills) → ~$21.

Usage:
    python3 scripts/gen_all_bloodlines.py
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
LOGDIR = Path("/tmp/allbloodlines_logs")
LOGDIR.mkdir(exist_ok=True)

# Extra-prompt nudge — pushes the existing painterly style toward the
# extreme ornamental detail of the latest Ashclan reference set Jamie
# shared (bone cradle whelp, shamanic warlord). The base STYLE_BASE in
# phase22 already produces Blizzard-cinematic quality; this just reinforces
# it for consistency across the 23 batch run.
EXTRA = (
    "extreme ornamental detail, ritual paint markings, heavily weathered "
    "fabric leather and bone, intricate beadwork tribal charms feathers "
    "skulls trophies, Blizzard World of Warcraft cinematic trailer "
    "rim-lighting, atmospheric particles embers smoke mist dust, dark "
    "moody dramatic key-light, hyperdetailed materials, Unreal Engine 5 "
    "cinematic render quality"
)

# (species, bloodline_id, folder_name) — folder names match the labels
# from species_library.py with proper capitalisation.
BLOODLINES = [
    ("orc",      "ashclan",     "Ashclan"),
    ("orc",      "bloodfang",   "Bloodfang"),
    ("elf",      "moonsong",    "Moonsong"),
    ("elf",      "sunweaver",   "Sunweaver"),
    ("elf",      "nightshade",  "Nightshade"),
    ("goblin",   "irontooth",   "IronTooth"),
    ("goblin",   "swampskin",   "Swampskin"),
    ("goblin",   "emberskin",   "Emberskin"),
    ("demon",    "infernal",    "Infernal"),
    ("demon",    "voidborn",    "Voidborn"),
    ("demon",    "ichorskin",   "Ichorskin"),
    ("drakkin",  "emberscale",  "Emberscale"),
    ("drakkin",  "frostscale",  "Frostscale"),
    ("drakkin",  "stormscale",  "Stormscale"),
    ("dwarf",    "ironbeard",   "Ironbeard"),
    ("dwarf",    "stonehammer", "Stonehammer"),
    ("dwarf",    "goldseeker",  "Goldseeker"),
    ("beastkin", "wolfkin",     "Wolfkin"),
    ("beastkin", "pantherkin",  "Pantherkin"),
    ("beastkin", "bearkin",     "Bearkin"),
    ("wraith",   "mourner",     "Skyweaver"),
    ("wraith",   "voidstalker", "Voidstalker"),
    ("wraith",   "sunspire",    "Sunspire"),
]


def run_one(sp: str, bl: str, name: str) -> tuple[str, str, int, int]:
    """Generate one bloodline and copy outputs into allbloodlines/<name>/."""
    log = LOGDIR / f"{sp}_{bl}.log"
    t0 = time.time()
    with log.open("w") as f:
        f.write(f"=== {sp}/{bl} → {name} ===\n")
        f.flush()
        result = subprocess.run(
            ["python3", str(PIPELINE), sp, bl, "--fresh",
             "--extra-prompt", EXTRA],
            cwd=str(POC), stdout=f, stderr=subprocess.STDOUT,
        )
    rc = result.returncode

    # Copy outputs into allbloodlines/<Name>/sNN_StageName.png
    target = DEST_BASE / name
    target.mkdir(parents=True, exist_ok=True)
    copied = 0
    for src_file in sorted(SRC.glob(f"{sp}_{bl}_s*.png")):
        # src_file.stem e.g. "orc_ashclan_s05_Youngling"
        rel = src_file.stem.replace(f"{sp}_{bl}_", "")  # "s05_Youngling"
        shutil.copy2(src_file, target / f"{rel}.png")
        copied += 1

    elapsed = int(time.time() - t0)
    return (sp, bl, rc, copied, elapsed)


def main() -> int:
    DEST_BASE.mkdir(exist_ok=True)
    print(f"=== generating {len(BLOODLINES)} bloodlines ===")
    print(f"output: {DEST_BASE}")
    print(f"logs:   {LOGDIR}")
    print(f"concurrency: 4")
    print(f"extra-prompt: {EXTRA[:80]}...")
    print()

    ok = 0
    fail = 0
    with ThreadPoolExecutor(max_workers=4) as ex:
        futures = {ex.submit(run_one, *bl): bl for bl in BLOODLINES}
        for fut in as_completed(futures):
            sp, bl, rc, copied, elapsed = fut.result()
            tag = "OK  " if rc == 0 and copied == 20 else "FAIL"
            if tag == "OK  ":
                ok += 1
            else:
                fail += 1
            print(f"[{tag}] {sp}/{bl:<11s}  copied {copied:>2d}/20  "
                  f"({elapsed}s)  → log: /tmp/allbloodlines_logs/{sp}_{bl}.log",
                  flush=True)

    print()
    print(f"=== done: {ok} ok, {fail} failed ===")
    print(f"folders ready in: {DEST_BASE}")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
