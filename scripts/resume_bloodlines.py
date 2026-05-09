#!/usr/bin/env python3
"""
resume_bloodlines.py — finish what gen_all_bloodlines.py couldn't.

Picks up after the first run hit Replicate's rate limiter + ran out of
credit. Splits the remaining work into:
  - 8 full --fresh runs (folders that are empty or near-empty)
  - 3 surgical --redo runs (folders with 17–19/20 — fill missing stages)

Concurrency drops 4 → 2 to stay under Replicate's 6-rpm throttle.

Usage:
    python3 scripts/resume_bloodlines.py
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

EXTRA = (
    "extreme ornamental detail, ritual paint markings, heavily weathered "
    "fabric leather and bone, intricate beadwork tribal charms feathers "
    "skulls trophies, Blizzard World of Warcraft cinematic trailer "
    "rim-lighting, atmospheric particles embers smoke mist dust, dark "
    "moody dramatic key-light, hyperdetailed materials, Unreal Engine 5 "
    "cinematic render quality"
)

# 8 bloodlines to run --fresh (empty or near-empty)
FRESH = [
    ("orc",      "bloodfang",   "Bloodfang"),
    ("dwarf",    "goldseeker",  "Goldseeker"),
    ("beastkin", "wolfkin",     "Wolfkin"),
    ("beastkin", "pantherkin",  "Pantherkin"),
    ("beastkin", "bearkin",     "Bearkin"),
    ("wraith",   "mourner",     "Skyweaver"),
    ("wraith",   "voidstalker", "Voidstalker"),
    ("wraith",   "sunspire",    "Sunspire"),
]

# 3 partials — surgical redo of just the missing stages
REDO = [
    # (sp, bl, name, [stage indexes to redo])
    ("dwarf", "ironbeard",   "Ironbeard",   [2]),
    ("dwarf", "stonehammer", "Stonehammer", [2, 3, 4]),
    ("drakkin", "stormscale", "Stormscale", [2, 3]),
]


def copy_outputs(sp: str, bl: str, name: str) -> int:
    target = DEST_BASE / name
    target.mkdir(parents=True, exist_ok=True)
    copied = 0
    for src in sorted(SRC.glob(f"{sp}_{bl}_s*.png")):
        rel = src.stem.replace(f"{sp}_{bl}_", "")
        shutil.copy2(src, target / f"{rel}.png")
        copied += 1
    return copied


def run_fresh(sp: str, bl: str, name: str) -> tuple[str, str, str, int, int]:
    log = LOGDIR / f"{sp}_{bl}.log"
    t0 = time.time()
    with log.open("w") as f:
        f.write(f"=== RESUME FRESH: {sp}/{bl} → {name} ===\n")
        f.flush()
        result = subprocess.run(
            ["python3", str(PIPELINE), sp, bl, "--fresh",
             "--extra-prompt", EXTRA],
            cwd=str(POC), stdout=f, stderr=subprocess.STDOUT,
        )
    copied = copy_outputs(sp, bl, name)
    return ("FRESH", sp, bl, copied, int(time.time() - t0))


def run_redo(sp: str, bl: str, name: str, stages: list[int]) -> tuple[str, str, str, int, int]:
    log = LOGDIR / f"{sp}_{bl}.log"
    t0 = time.time()
    redo_arg = ",".join(str(s) for s in stages)
    with log.open("w") as f:
        f.write(f"=== RESUME REDO: {sp}/{bl} → {name}, stages {stages} ===\n")
        f.flush()
        result = subprocess.run(
            ["python3", str(PIPELINE), sp, bl, "--redo", redo_arg,
             "--extra-prompt", EXTRA],
            cwd=str(POC), stdout=f, stderr=subprocess.STDOUT,
        )
    copied = copy_outputs(sp, bl, name)
    return ("REDO", sp, bl, copied, int(time.time() - t0))


def main() -> int:
    print(f"=== resume: {len(FRESH)} fresh + {len(REDO)} redo ===")
    print(f"concurrency: 2 (down from 4 to stay under Replicate throttle)")
    print()

    ok = 0
    fail = 0
    with ThreadPoolExecutor(max_workers=2) as ex:
        futures = []
        for sp, bl, name in FRESH:
            futures.append(ex.submit(run_fresh, sp, bl, name))
        for sp, bl, name, stages in REDO:
            futures.append(ex.submit(run_redo, sp, bl, name, stages))

        for fut in as_completed(futures):
            mode, sp, bl, copied, elapsed = fut.result()
            tag = "OK  " if copied == 20 else "FAIL"
            if tag == "OK  ":
                ok += 1
            else:
                fail += 1
            print(f"[{tag}] {mode:5s} {sp}/{bl:<11s}  {copied:>2d}/20  "
                  f"({elapsed}s)", flush=True)

    print()
    print(f"=== resume done: {ok} ok, {fail} failed ===")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
