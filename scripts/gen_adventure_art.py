#!/usr/bin/env python3
"""
gen_adventure_art.py — cinematic location art for the Adventures map.

Dizzydreamer Adventures-map pass: each adventure gets a landscape thumbnail
and the page gets a wide cinematic hero banner (feathered at the sides in
CSS). Environment art only — no characters in the location tiles — so they
read as places, in the same painted family as the champion/equipment art.

Output (optimized web JPEGs, the frontend references these):
    adventures/<key>.jpg        # 8 location tiles, ~896px wide
    adventures/banner.jpg       # wide hero banner, ~1792px wide

Raw 1536x1024 PNGs are kept under adventures/_raw/ for re-export.

Usage:
    python3 scripts/gen_adventure_art.py            # generate missing
    python3 scripts/gen_adventure_art.py --force
    python3 scripts/gen_adventure_art.py --only banner
"""
from __future__ import annotations

import argparse, base64, json, os, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

SECRETS = Path.home() / ".openclaw" / "secrets.json"
os.environ["OPENAI_API_KEY"] = json.loads(SECRETS.read_text())["OPENAI_API_KEY"]
from openai import OpenAI  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "adventures"
RAW = DEST / "_raw"

_client = None
def client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI()
    return _client

# ── Style lock — painterly fantasy ENVIRONMENT art, same family as the
# champion/equipment set, but landscapes with no foreground characters. ──
ENV_STYLE = (
    "Cinematic painterly fantasy environment concept art, atmospheric depth, "
    "dramatic volumetric lighting, rich but slightly muted palette with one "
    "accent colour pulled forward, painted-3D rendered look matching the "
    "VulcanX Champions art set (gpt-image-1.5). Wide establishing landscape "
    "shot of a PLACE — no people, no characters, no creatures in the "
    "foreground, no text, no logos, no UI, no frame or border. Composed so "
    "the centre reads clearly when cropped to a wide card."
)

LOCATIONS = [
    ("hunting_grounds", "Rolling sunlit green plains at golden hour, tall windswept grass, scattered rocks and a lone gnarled tree, distant hills under a warm sky."),
    ("ancient_ruins",   "Crumbling overgrown stone temple halls, toppled columns, faded glowing arcane glyphs on the walls, shafts of dusty light, creeping vines, teal magic glow."),
    ("spirit_caves",    "Vast underground crystal cavern, glowing ethereal blue spirit-wisps drifting over still reflective pools, luminescent crystals, cool mystical light."),
    ("treasure_crypts", "Torch-lit underground vault chamber, heaps of gold coins and scattered gems, ornate stone sarcophagi, a faint trapped-corridor menace, warm gold glow."),
    ("forge_pits",      "Volcanic forge cavern, molten lava channels glowing orange, massive anvils and chains, drifting embers and sparks, intense fiery red light."),
    ("moonlit_glades",  "Moonlit forest clearing at night, silver light through the canopy, drifting fireflies, soft mist over mossy ground, cool blue-green glow."),
    ("ember_wastes",    "Cracked burning desert wasteland, glowing lava fissures across black scorched earth, ash-grey sky, a distant smoking volcano, harsh orange light."),
    ("whisper_marshes", "Misty swamp bog at dusk, twisted dead trees, glowing herbs and mushrooms, low fog over dark water, eerie green-gold glow."),
]

BANNER = (
    "banner",
    "Epic wide fantasy panorama at dusk: a grand fortified castle on a high "
    "hill catching warm light, distant mountain range, a few tiny silhouetted "
    "adventurers with a raised banner standing on a ridge in the lower-left "
    "looking toward the castle, sweeping purple-and-amber twilight sky, "
    "sense of an epic journey beginning.",
)


def gen_one(key: str, concept: str, model: str, force: bool, size: str, out_w: int) -> str:
    raw = RAW / f"{key}.png"
    out = DEST / f"{key}.jpg"
    if out.exists() and not force:
        return f"skip {key}"
    prompt = f"{concept}\n\n{ENV_STYLE}"
    for attempt in range(3):
        try:
            r = client().images.generate(
                model=model, prompt=prompt, size=size, quality="high", n=1,
            )
            raw.write_bytes(base64.b64decode(r.data[0].b64_json))
            # Optimize to a web JPEG: resize to out_w, quality ~80.
            subprocess.run(
                ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "80",
                 "--resampleWidth", str(out_w), str(raw), "--out", str(out)],
                check=True, capture_output=True,
            )
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
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--only", choices=["banner", "locations"], default=None)
    args = ap.parse_args()

    DEST.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)

    jobs = []  # (key, concept, size, out_w)
    if args.only != "banner":
        for k, c in LOCATIONS:
            jobs.append((k, c, "1536x1024", 896))
    if args.only != "locations":
        jobs.append((BANNER[0], BANNER[1], "1536x1024", 1792))

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = [ex.submit(gen_one, k, c, args.model, args.force, sz, w) for k, c, sz, w in jobs]
        for f in as_completed(futs):
            print(f.result(), flush=True)


if __name__ == "__main__":
    main()
