#!/usr/bin/env python3
"""
gen_species_icons.py — painted species emblem icons for the Choose-Your-Species
screen (Jamie, 14 Jul: replace the emoji with "cooler, fantasy, realist/WoW
style" icons). Same style family as the equipment/potion sets (imports STYLE +
client from gen_nft_item_images.py).

Output: nft_images/icons/species_<key>.png (1024 source downscaled to 512 for
crisp retina at the 96-128px card size).
"""
import sys, time, base64
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from gen_nft_item_images import STYLE, client  # style lock + API client
from PIL import Image

OUT = Path(__file__).parent.parent / "nft_images" / "icons"

# Per-species emblem concepts — dark-fantasy painted busts/emblems in the
# WoW-adjacent painterly style, reading strongly at card size.
SPECIES = {
    "orc": (
        "Fierce orc war-chief head emblem: jutting jaw with broken tusks, "
        "heavy brow, war-braided topknot, deep green skin with battle scars, "
        "iron nose-ring, snarling. Three-quarter view bust, dark fantasy "
        "painted, dramatic rim light."
    ),
    "elf": (
        "Elven druid-ranger visage emblem: elegant sharp-featured face half in "
        "moon-shadow, long silver hair, leaf-shaped ears, glowing moonlit eyes, "
        "antler-and-crescent circlet, deep forest greens and silver. "
        "Three-quarter view bust, dark fantasy painted."
    ),
    "goblin": (
        "Cunning goblin rogue head emblem: wicked toothy grin, huge pointed "
        "ears with brass rings, beady amber eyes glinting with mischief, dark "
        "hood half-drawn, mottled olive skin, a dagger tip visible. "
        "Three-quarter view bust, dark fantasy painted."
    ),
    "demon": (
        "Flame paladin demon emblem: horned infernal knight helm wreathed in "
        "living fire, molten cracks glowing through obsidian armour plates, "
        "burning ember eyes, ash and cinders rising. Three-quarter view bust, "
        "dark fantasy painted, fire accent colour."
    ),
    "drakkin": (
        "Drakkin dragonkin head emblem: scaled draconic profile with swept-back "
        "horns, ember-lit eye with slit pupil, iridescent teal-to-crimson "
        "scales, small flame curling from nostril. Three-quarter view bust, "
        "dark fantasy painted."
    ),
    "dwarf": (
        "Dwarven defender head emblem: mighty braided beard with forged iron "
        "rings, horned half-helm, stern deep-set eyes, runic forge-glow "
        "reflections on weathered face, anvil-solid presence. Three-quarter "
        "view bust, dark fantasy painted."
    ),
    "beastkin": (
        "Beastkin primal wolf-warrior head emblem: snarling lupine muzzle with "
        "bared fangs, feral golden eyes, tribal bone-and-feather adornments, "
        "storm-grey fur with war paint streaks. Three-quarter view bust, dark "
        "fantasy painted."
    ),
    "wraith": (
        "Spirit-warrior wraith emblem: spectral hooded astral figure, face of "
        "cold starlight mist, glowing rune-etched spectral crown, wisps of "
        "soul-fire trailing upward, translucent ethereal blues and violets. "
        "Three-quarter view bust, dark fantasy painted."
    ),
}

def main():
    force = "--force" in sys.argv
    for key, concept in SPECIES.items():
        out = OUT / f"species_{key}.png"
        if out.exists() and not force:
            print(f"  {out.name}: exists, skipping"); continue
        prompt = concept + " " + STYLE
        t0 = time.time()
        r = client().images.generate(model="gpt-image-1.5", prompt=prompt,
                                     size="1024x1024", quality="high", n=1)
        out.write_bytes(base64.b64decode(r.data[0].b64_json))
        # downscale to 512 for weight (cards show ~96-128px; 512 = retina-crisp)
        im = Image.open(out); im.thumbnail((512, 512), Image.LANCZOS); im.save(out)
        print(f"  {out.name}: generated in {time.time()-t0:.0f}s "
              f"({out.stat().st_size//1024} KB)")

if __name__ == "__main__":
    main()
