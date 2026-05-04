#!/usr/bin/env python3
"""Generate 5 Campaign-mode boss portraits via OpenAI gpt-image-1.
Saved to img/campaign/boss_{N}_{slug}.png — square 1024x1024 portraits
that match the painterly style of the existing champion stage art.
"""
import os, sys, base64, time, concurrent.futures
from pathlib import Path
from openai import OpenAI

OUT = Path(__file__).parent.parent / "img" / "campaign"
OUT.mkdir(parents=True, exist_ok=True)

STYLE = (
    "Highly detailed digital fantasy painting, dramatic cinematic lighting, "
    "rich saturated colors, painterly brushwork, dark moody atmosphere with "
    "rim-light highlighting the figure, square 1:1 portrait, full body or "
    "chest-up framing, ornate fantasy game boss splash-art quality, "
    "concept art style similar to Diablo IV / Magic the Gathering. "
    "No text, no watermarks, no UI elements."
)

BOSSES = [
    ("ch1_skarn",
     "Skarn the Whelp-Eater, a bloated brutish goblin warlord, two-meter "
     "tall, sickly green skin scarred from a hundred fights, wearing rusted "
     "iron pauldrons and a crude leather kilt. He carries a spiked bone "
     "club. Chained to his belt: tiny terrified baby creature dolls (NOT "
     "human children — fantasy whelps with horns and tails). He stands in "
     "an underground gladiator pit lit by torches, blood-stained sand under "
     "his boots, jeering crowd silhouettes in the dark background. "
     "Menacing pose, snarling, drool, one yellow eye, the other a milky scar."),

    ("ch2_vexora",
     "Vexora the Bone Empress, an ancient lich-witch sorceress, gaunt pale "
     "blue-grey skin stretched over sharp cheekbones, glowing violet eyes, "
     "long black hair flowing as if underwater. She wears flowing dark robes "
     "embroidered with skeletal runes, a crown of finger-bones. Seated on a "
     "throne built from fused warrior skulls and rib-cages. Spectral "
     "skeletal champion silhouettes kneel in the shadows around her. "
     "Cold blue magical mist coils through the colosseum ruins behind her. "
     "Regal, terrifying, motionless."),

    ("ch3_mossback",
     "Thornwarden Mossback, a colossal ancient treant titan, twenty meters "
     "tall, gnarled bark-skin armor cracked and weeping black sap, draped "
     "in moss and luminous fungi, glowing molten-orange eyes deep in a "
     "knothole face. Branches thrust outward like spears. One enormous "
     "fist clutches a uprooted tree as a club. Standing in a cursed "
     "primeval forest at twilight, twisted roots erupting from the ground, "
     "ravens circling, witchlight fireflies. Ominous and primordial."),

    ("ch4_pyrrhos",
     "Inferno-King Pyrrhos, a massive horned demon warrior, three meters "
     "tall, deep-crimson scaled skin lit from within by molten cracks, "
     "obsidian-black armor inlaid with glowing magma runes. Wields TWIN "
     "curved lava-blade swords dripping fire. Towering ram horns, glowing "
     "yellow eyes, snarling fanged mouth. Stands atop a volcanic throne of "
     "obsidian on the rim of an active caldera. Lava rivers flow behind him, "
     "ash falling like snow. Aggressive battle stance, blades raised."),

    ("ch5_aetheron",
     "Voidlord Aetheron, the final boss, a fallen-god champion who once "
     "embodied every bloodline. Tall majestic figure in cracked golden "
     "armor that shifts between elemental affinities — orc tusks, elven "
     "ears, drakkin scales, demon horns, all asymmetrically merged. Eyes "
     "are pure white starlight. He hovers above a cosmic colosseum floating "
     "in deep space, nebulae and shattered planet fragments behind him. "
     "Wields a silver spear that splits reality. Halo of dark energy. "
     "Calm, transcendent, terrifying. The end of the campaign."),
]


def gen_one(slug, prompt):
    t0 = time.time()
    print(f"[start] {slug}")
    client = OpenAI()  # picks up OPENAI_API_KEY
    full = STYLE + " " + prompt
    try:
        r = client.images.generate(
            model="gpt-image-1",
            prompt=full,
            size="1024x1024",
            quality="high",
            n=1,
        )
        b64 = r.data[0].b64_json
        out = OUT / f"boss_{slug}.png"
        out.write_bytes(base64.b64decode(b64))
        dt = time.time() - t0
        print(f"[ok]    {slug} -> {out.name} ({dt:.1f}s)")
        return (slug, True, dt)
    except Exception as e:
        dt = time.time() - t0
        print(f"[FAIL]  {slug} ({dt:.1f}s): {e}")
        return (slug, False, dt)


def main():
    if not os.environ.get("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY not set", file=sys.stderr)
        sys.exit(1)
    print(f"Generating {len(BOSSES)} boss portraits via gpt-image-1 (parallel)...")
    print(f"Output dir: {OUT}")
    print("=" * 60)
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures = [pool.submit(gen_one, s, p) for s, p in BOSSES]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    print("=" * 60)
    ok = sum(1 for _, success, _ in results if success)
    print(f"Done: {ok}/{len(BOSSES)} succeeded.")
    for slug, success, dt in results:
        marker = "OK" if success else "FAIL"
        print(f"  [{marker:>4}] {slug} ({dt:.1f}s)")


if __name__ == "__main__":
    main()
