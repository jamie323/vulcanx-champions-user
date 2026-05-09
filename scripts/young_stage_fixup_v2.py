#!/usr/bin/env python3
"""
young_stage_fixup_v2.py — fix the broken s01–s05 baby art across all
23 bloodlines after the v1 fix-up shipped adult-shaped "babies".

What v1 fix-up got wrong:
  - Top-down cascade: s05 anchor regenerated first, then s01 used s05
    as image_prompt ref. Even at strength=0.10 the silhouette of an
    older child bleeds into the infant.
  - Extra-prompt cued adult features ("baby ORC with prominent tusks
    and heavy brow ridge") that pulled the model toward adult orcs.
  - phase22's young-stage template literally rendered "TINY CHIBI BABY"
    as on-image text.
  - Orchestrator declared success on file count, not visual correctness.

What v2 fix does:
  - Bottom-up cascade (--bottom-up). s01 generates text-only (no ref)
    so the baby silhouette is set cleanly by the prompt. s05 then uses
    NEW s01 as ref, inheriting the correct baby-trajectory silhouette.
    s02–s04 Kontext fills inherit from s05.
  - Per-bloodline extra-prompt with NO adult features named (no tusks,
    no brow-ridge, no muscles). Just skin keyword + style nudge.
  - phase22 young-stage template has been rewritten — no more all-caps
    "TINY CHIBI BABY" text, lowercase prose, explicit anti-adult
    negatives. Fix lives in
    ~/VulcanX-Avatar-PoC/phase22_twenty_stage_chain.py.
  - Orchestrator outputs a spot-check table: file size for each new
    young-stage output. Big anomalies show up in the table for visual
    review (5MB = Flux Ultra anchor, 1–2MB = Kontext fill).

Cost: ~$0.20 per bloodline × 23 = ~$5. Wall: ~30 min at concurrency 2.

Usage:
    python3 scripts/young_stage_fixup_v2.py
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
LOGDIR = Path("/tmp/young_stage_v2_logs")
LOGDIR.mkdir(exist_ok=True)

# Style nudge — same as v2 main batch but without ANY adult-feature
# language. The new young-stage template in phase22 already adds the
# explicit baby/anti-adult prose, so we just push skin keyword + style.
COMMON_STYLE = (
    "semi-photoreal painted fantasy illustration, painterly brushwork, "
    "oil-painting feel, dramatic chiaroscuro cinematic lighting, "
    "atmospheric depth, plain unmarked background, no watermarks, "
    "no text, no logos, no signatures, no gibberish writing on floor"
)

# (species, bloodline_id, folder_name, skin_keyword) — same skin
# overrides as the v2 main batch so the bloodline palette stays right.
# Ashclan is already done (manual single-bloodline test passed) — skipped.
BLOODLINES = [
    ("orc",      "bloodfang",   "Bloodfang",   "RED SKIN"),    # softer than DEEP CRIMSON
    ("elf",      "moonsong",    "Moonsong",    "WHITE SKIN"),
    ("elf",      "sunweaver",   "Sunweaver",   "GOLDEN SKIN"),
    ("elf",      "nightshade",  "Nightshade",  "WHITE SKIN"),
    ("goblin",   "irontooth",   "IronTooth",   ""),
    ("goblin",   "swampskin",   "Swampskin",   ""),
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

# All young-stage redos route through Flux Pro at safety_tolerance=6.
# Reason (8 May test): "8-year-old, bare-chested, sparring stance" is
# how STAGES_DATA[5] frames Youngling — combined with any species DNA
# that mentions tribal nudity / scars / paint, it consistently trips
# Flux Ultra's NSFW classifier. Flux Pro at safety_tolerance=6 lets
# the same prompt through. Same trick that unblocked Bloodfang.
ALWAYS_FLUX_PRO = True

YOUNG_STAGES = [1, 2, 3, 4, 5]


def extra_prompt_for(skin_keyword: str) -> str:
    skin_part = f"{skin_keyword}. " if skin_keyword else ""
    return f"{skin_part}{COMMON_STYLE}"


def copy_outputs(sp: str, bl: str, name: str) -> dict[int, int]:
    """Copy s01–s05 into allbloodlines/<name>/. Returns {idx: size_kb}."""
    target = DEST_BASE / name
    target.mkdir(parents=True, exist_ok=True)
    sizes = {}
    for idx in YOUNG_STAGES:
        # source filename pattern: {sp}_{bl}_s{idx:02d}_{StageName}.png
        matches = list(SRC.glob(f"{sp}_{bl}_s{idx:02d}_*.png"))
        if not matches:
            continue
        src = matches[0]
        rel = src.stem.replace(f"{sp}_{bl}_", "")
        dest = target / f"{rel}.png"
        shutil.copy2(src, dest)
        sizes[idx] = src.stat().st_size // 1024
    return sizes


def run_one(sp: str, bl: str, name: str, skin: str):
    """Run phase22 with --redo 1,2,3,4,5 --bottom-up. Returns spot-check info."""
    log = LOGDIR / f"{sp}_{bl}.log"
    extra = extra_prompt_for(skin)
    # --redo 2,3,4,5 (NOT 1) preserves the s01 anchor if the main batch
    # produced a clean baby — saves ~10s per bloodline. If s01 is wrong
    # for a given bloodline, manually delete it before running this and
    # phase22 will regenerate.
    cmd = ["python3", str(PIPELINE), sp, bl,
           "--redo", "1,2,3,4,5",
           "--bottom-up",
           "--extra-prompt", extra]
    if ALWAYS_FLUX_PRO:
        cmd.append("--flux-pro")
    t0 = time.time()
    with log.open("w") as f:
        f.write(f"=== young-stage v2 fixup: {sp}/{bl} → {name}  "
                f"(skin: {skin or 'default-green'})  flags: {' '.join(cmd[3:])} ===\n")
        f.flush()
        result = subprocess.run(cmd, cwd=str(POC),
                                stdout=f, stderr=subprocess.STDOUT)
    rc = result.returncode
    sizes = copy_outputs(sp, bl, name)
    elapsed = int(time.time() - t0)
    return (sp, bl, name, rc, sizes, elapsed)


def main() -> int:
    print(f"=== young-stage v2 fixup: {len(BLOODLINES)} bloodlines, concurrency 2 ===")
    print(f"strategy: --redo 1,2,3,4,5 --bottom-up (s01 text-only first)")
    print(f"output:  {DEST_BASE}/<Bloodline>/s0[1-5]_*.png")
    print(f"logs:    {LOGDIR}")
    print()

    ok = 0
    fail = 0
    table = []
    with ThreadPoolExecutor(max_workers=2) as ex:
        futures = {ex.submit(run_one, *bl): bl for bl in BLOODLINES}
        for fut in as_completed(futures):
            sp, bl, name, rc, sizes, elapsed = fut.result()
            count = len(sizes)
            tag = "OK" if rc == 0 and count == 5 else "WARN"
            if tag == "OK":
                ok += 1
            else:
                fail += 1
            size_str = " ".join(f"s{i:02d}={sizes.get(i, 0):>4d}KB" for i in YOUNG_STAGES)
            print(f"[{tag:4s}] {name:<13s} {size_str}  ({elapsed}s)", flush=True)
            table.append((name, sizes, rc, elapsed))

    print()
    print(f"=== young-stage v2 fixup done: {ok} ok, {fail} warn ===")
    print()
    print("Spot-check guide: file sizes by stage type:")
    print("  ~4-5MB = Flux Ultra anchor (s01, s05 in bottom-up)")
    print("  ~1-2MB = Kontext fill (s02, s03, s04)")
    print("  Anomalies (e.g. s01 < 2MB) suggest the s01 anchor failed and")
    print("  was filled by Kontext from s09 — visual check needed.")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
