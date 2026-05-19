#!/usr/bin/env python3
"""
populate_bloodline_metadata.py

One-shot transformer that flips the 25 placeholder bloodlines in
bloodlines.json to the same shape as the (already-launched) Ironfang
template:

  - For each stage: img = 'evolution20/<species>/<bloodline>/sNN.png',
    coming_soon = false
  - complete  = true
  - adoptable = true
  - story     = 2-3 sentence lore string (drafted below per bloodline)

Why this exists: art for all 26 bloodlines is already on disk under
evolution20/, but bloodlines.json was gating each one with
adoptable:false + coming_soon:true on every stage, so the Adopt grid
only ever surfaced Ironfang. This script flips the gate.

Idempotent: re-running just re-writes the same fields. Backs up the
existing JSON to bloodlines.json.bak before writing.

Run:
    python3 scripts/populate_bloodline_metadata.py
"""
import json, shutil
from pathlib import Path

ROOT = Path(__file__).parent.parent
BL_JSON = ROOT / "bloodlines.json"

# ── Stories ─────────────────────────────────────────────────────────
# 2-3 sentence lore per bloodline. Hooks each story on the hero name +
# passive-ability flavor + species archetype. Tone matches a fantasy
# trading-card backstory — flavorful, not overwritten.

STORIES = {
    "orc/ironfang":     "Grokk of the Ironfang clan was forged in the smoking pits beneath the Black Mountains, where weakness is beaten out and resolve hammered in. Their warriors bend before they break, and only the foolish mistake patience for mercy.",
    "orc/ashclan":      "Ashkar Bonecaller speaks to the embers that linger after every battle, drawing strength from the smoke of the fallen. The Ashclan walk last from every burning field — and arrive first at the next.",
    "orc/bloodfang":    "The Bloodfang hunt because the hunt sharpens the spirit, not because they are hungry. Each wound dealt feeds the next blow, until the warrior is a moving storm of red iron.",
    "orc/tuskborn":     "Grom of the Tuskborn is never alone — his clan stands behind every swing, and his rage rises sharpest when his kin lie wounded. A Tuskborn cornered fights for ten.",
    "orc/dreadclaw":    "Skarn the Skull Reaper carries a tally carved into his pauldron, one notch per heart stopped. The Dreadclaw believe a critical blow is a sacrament, and they tend it with cold devotion.",

    "elf/moonsong":     "The Moonsong walk between the silver wash of moonlight and the dark beneath it, slipping past blades meant to find them. Their grace is not vanity — it is the only armor their lithe frames will ever need.",
    "elf/sunweaver":    "Sunweavers draw a current of solar charge into their open palms each dawn, releasing it across the battlefield as searing light. To meet one at noon is to fight a furnace that smiles.",
    "elf/nightshade":   "Nightshade adepts learn to stand inside a shadow before they learn to draw a blade. Their first strike is always the one their enemy never sees coming.",

    "goblin/irontooth": "Irontooth goblins file their fangs against the bones of those who underestimate them, and an Irontooth bite carries the grudge of every previous mark. The smallest jaw in the warband, the longest memory.",
    "goblin/swampskin": "Swampskin warriors are coated in the slick weed-oils of the marshes — blows slide off them, grips slip free, and they laugh while you flail. Try to pin one and you'll find yourself face-down in the reeds.",
    "goblin/emberskin": "Emberskin goblins crackle when they move, sparks shaking loose from their dust-dry hide. Strike one and you'll find the heat answers back — louder than they are.",

    "demon/infernal":   "Infernal demons carry the furnace in their chest, breathing hellfire as casually as a mortal exhales. To stand against one is to feel the wrath of every soul their flame has ever tasted.",
    "demon/voidborn":   "Voidborn drink the strength out of their foes, draining vitality the way a mortal draws breath. Each strike returns something to them — and takes something more from you.",
    "demon/ichorskin":  "The Ichorskin bleed black, and the black bleeds back. Their cursed skin makes them harder to wound the longer the fight goes — your sword tires before they do.",

    "drakkin/emberscale": "Emberscale drakkin hatched in the calderas of the old volcanoes, their breath carrying the deep heat of the dragons that came before. A single roar can crack a shield wall — and melt the courage behind it.",
    "drakkin/frostscale": "Frostscale drakkin walk wrapped in the rime of the high glaciers, every blow that lands on them met by a wall of crystallised ice. Wear them down? They wear you down first.",
    "drakkin/stormscale": "Stormscale drakkin carry the wind in their wings and the lightning in their eyes. They strike between the heartbeats of slower fighters and are gone before the thunder catches up.",

    "dwarf/ironbeard":   "Ironbeards are forged in the deep halls, beards braided with iron rings won from every campaign survived. Their resolve, like their hammer-hafts, only grows denser with every blow it takes.",
    "dwarf/stonehammer": "A Stonehammer's first strike is a question — the second is the answer. They learn the anvil rhythm before they learn to walk, and each blow lands with the weight of the mountain that raised them.",
    "dwarf/goldseeker":  "Goldseekers chase fortune the way other warriors chase glory, and the gods of luck seem to follow them home. Whatever a Goldseeker reaches for, the dice tend to favour.",

    "beastkin/wolfkin":    "Wolfkin run in lockstep, every move triangulated against the pack-mind behind their eyes. A lone Wolfkin is a problem; a Wolfkin with its kin nearby is a slaughter.",
    "beastkin/pantherkin": "Pantherkin warriors coil before they pounce, every muscle wound tight, every breath held. By the time you see one move, you are already inside the arc of its first claw.",
    "beastkin/bearkin":    "Bearkin do not feint, do not retreat, do not consider the smaller blow. When a Bearkin commits to a strike, it is to maul — and the field afterward bears the mark of the meeting.",

    # NOTE: bloodline KEY is 'mourner' but label/heroName are 'Skyweaver/Lyra'
    # — pre-existing data drift (see bloodlines.json). Story matches the visible
    # label so Adopt cards stay coherent; folder rename is tech-debt for later.
    "wraith/mourner":     "Lyra of the Skyweavers walks the bright threads stitched between the stars, drawing a soul-link from the constellations that watched her ancestors fall. Strike one and the bound spirit answers — colder than starlight, twice as keen.",
    "wraith/voidstalker": "Voidstalkers slip between realities at will, blade entering before their body finishes the step. By the time you sense the chill behind you, the wound is already done.",
    "wraith/sunspire":    "Sunspire wraiths carry the radiance of the funeral pyres they were burned upon — a blessing wrapped around a curse. Their light heals their kin and sears anything that does not deserve to stand in it.",
}


def stage_img(species_id, bloodline_id, idx_1based):
    return f"evolution20/{species_id}/{bloodline_id}/s{idx_1based:02d}.png"


def main():
    raw = json.loads(BL_JSON.read_text())
    species = raw["species"]

    # Backup once per run
    shutil.copy(BL_JSON, BL_JSON.with_suffix(".json.bak"))

    counts = {"updated": 0, "stages_updated": 0, "stories_added": 0}

    for sp_id, sp in species.items():
        for bl_id, bl in sp.get("bloodlines", {}).items():
            key = f"{sp_id}/{bl_id}"

            # Stage img + coming_soon
            for idx, stage in enumerate(bl["stages"], start=1):
                stage["img"] = stage_img(sp_id, bl_id, idx)
                stage["coming_soon"] = False
                counts["stages_updated"] += 1

            # Flags
            bl["complete"] = True
            bl["adoptable"] = True
            counts["updated"] += 1

            # Story
            story = STORIES.get(key)
            if not story:
                print(f"  ! WARNING: no story for {key} — leaving existing/empty")
            else:
                bl["story"] = story
                counts["stories_added"] += 1

    BL_JSON.write_text(json.dumps(raw, indent=2) + "\n")

    print(f"bloodlines updated:  {counts['updated']}")
    print(f"stages img-mapped:   {counts['stages_updated']}")
    print(f"stories added:       {counts['stories_added']}")
    print(f"backup written:      {BL_JSON.with_suffix('.json.bak')}")


if __name__ == "__main__":
    main()
