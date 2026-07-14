#!/usr/bin/env python3
"""Painted equipment-slot icons (weapon/armor/trinket/boots/aura) — same style
family as the equipment set. Output: nft_images/icons/slot_<key>.png"""
import sys, time, base64
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from gen_nft_item_images import STYLE, client
from PIL import Image

OUT = Path(__file__).parent.parent / "nft_images" / "icons"
SLOTS = {
    "weapon":  "Crossed battle sword and war axe emblem, weathered steel with "
               "bronze fittings, faint forge-glow on the edges.",
    "armor":   "Ornate fantasy breastplate emblem, layered steel plates with "
               "embossed gold trim and rivets, battle-worn.",
    "trinket": "Mystical arcane ring emblem, heavy gold band holding a glowing "
               "violet gemstone with faint runes orbiting it.",
    "boots":   "Sturdy fantasy adventurer boots emblem, tooled leather with "
               "steel toe-guards and buckled straps.",
    "aura":    "Radiant magical aura emblem, a floating golden sigil ringed by "
               "swirling light motes and soft energy wisps.",
}
force = "--force" in sys.argv
for key, concept in SLOTS.items():
    out = OUT / f"slot_{key}.png"
    if out.exists() and not force:
        print(f"  {out.name}: exists, skipping"); continue
    t0 = time.time()
    r = client().images.generate(model="gpt-image-1.5", prompt=concept + " " + STYLE,
                                 size="1024x1024", quality="high", n=1)
    out.write_bytes(base64.b64decode(r.data[0].b64_json))
    im = Image.open(out); im.thumbnail((256, 256), Image.LANCZOS); im.save(out)
    print(f"  {out.name}: generated in {time.time()-t0:.0f}s ({out.stat().st_size//1024} KB)")
