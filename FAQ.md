# VulcanX Champions — Player FAQ

_Last updated: 20 June 2026. Covers the current build. A few systems are still
in QA (testing) mode — those are flagged "🧪 QA" below. If something doesn't
match what you see, hard-refresh (Cmd/Ctrl+Shift+R) — the site rebuilds on a
short delay after updates._

---

## 1. Getting Started

**What is VulcanX Champions?**
A collect-raise-and-battle game. You adopt a baby champion NFT, feed and evolve
it through 20 life stages (level 1 → 50), gear it up, and fight in the Arena,
on Adventures, and through the Campaign. It runs in your browser on the Elysium
chain — no download, no email.

**How do I sign in?**
Connect a wallet (MetaMask or WalletConnect). We'll switch you to **Elysium
(chain 1339)** automatically if needed, then ask you to sign a short message to
prove you own the wallet. That's it — no email, no password, no gas for sign-in.

**How do I adopt a champion?**
Click **Adopt a Baby Champion**, pick a species, pick a bloodline, name it, and
sign the "adoption ceremony" message in your wallet. The egg hatches in a short
cinematic and you land on your champion screen ready to play.

**Are names permanent?**
Yes — your champion's name is permanent and is shown on the NFT. You can rename
later from the ✏️ pencil (5 PYR in production; 🧪 free in QA).

---

## 2. Species & Bloodlines

**How many are there?**
**8 species, 26 bloodlines** — and they're **all adoptable now**, each with its
own full 20-stage art.

| Species | Archetype | Bloodlines |
|---|---|---|
| **Orc** | Brute | Ironfang, Ashclan, Bloodfang, Tuskborn, Dreadclaw |
| **Elf** | Druid/Ranger | Moonsong, Nightshade, Sunweaver |
| **Goblin** | Rogue | Irontooth, Swampskin, Emberskin |
| **Demon** | Pyromancer | Infernal, Voidborn, Ichorskin |
| **Drakkin** | Elemental | Emberscale, Frostscale, Stormscale |
| **Dwarf** | Defender | Ironbeard, Stonehammer, Goldseeker |
| **Beastkin** | Primal | Wolfkin, Pantherkin, Bearkin |
| **Wraith** | Astral | Mourner, Voidstalker, Sunspire |

**Does my bloodline matter?**
Yes. Each bloodline has its own **stat weighting** (0.7×–1.3× per trait), so a
strength-focused bloodline gains a bit more Strength from the same potion, and a
bit less of its weak traits. Each also has a unique **Bloodline Signature**
combat passive and its own art.

---

## 3. Stats & Traits

Every champion has six traits:

| Trait | What it does |
|---|---|
| 💪 **Strength (STR)** | Physical/weapon damage |
| ❤️ **Vitality (VIT)** | Hit points + survivability |
| 🏃 **Agility (AGI)** | Initiative (who goes first) + dodge |
| ⚔️ **Ferocity (FER)** | Critical-hit chance + crit damage |
| 🧠 **Intelligence (INT)** | Magic damage + spell resist |
| 🍀 **Luck (LCK)** | Gear-effect proc chance, dodge, lucky drops |

**Stat caps:** each trait has a cap that **rises every level** (smoothly, not in
big jumps), so there's always room to grow as you level. Caps start small at L1
and climb into the thousands by L50.

---

## 4. Potions & Feeding

**Trait potions** raise a single stat. There are three tiers:

| Tier | Stat gain | Shop price |
|---|---|---|
| **Minor** | +5 | 5 PYR |
| **Major** | +15 (≈3× Minor) | 15 PYR |
| **Epic** | +40 (≈8× Minor) | 40 PYR |

Gains are **flat** (no diminishing returns) and then adjusted by your bloodline's
weighting for that trait. Feeding a maxed trait still consumes the potion and
fills your Evolution Bar — the stat just won't rise (you'll see "TRAIT MAXED ·
+X% BAR").

**Three ways to feed:**
- **Single tap** — click one trait bottle to feed exactly one potion (fine-tuning).
- **Feed Me!** (big button) — auto-picks the lowest, non-capped trait to keep your
  build balanced.
- **Batch** — pour 5 / 25 / 50 / All at once. Auto-stops at the next stage gate so
  you don't overshoot.

**Special potions** (separate from trait potions):
- ⚡ **Evolution Potion** — used at a stage-gate level with a full Evolution Bar to
  advance to the next stage.
- ✨ **Blessing** — distributes **40 stat points** freely across your traits and
  fills 10–25% of the Evolution Bar. It stays **locked until your champion has
  room for all 40 points** so none are wasted (level up to raise your caps).
- 🧪 **Healing Salve** — instantly restores your champion's HP after Arena fights.

**Limited Drops** (rare NFT potions, in the Shop → ✨ Limited Drops):
- **Founder's Elixir** — permanent +5 to all 6 stats, one-time per champion.
- **Stage Skip** — instant +1 stage evolution, ignores the level gate (stages 1–18).
- **Phoenix Tear** — cancels/reflects one Arena loss this week, auto-consumes.
- **Bond Bloom** — instant +50 bond on any champion.
- **Whispered Trinket** — re-rolls a champion's power-ring trinket stat.

---

## 5. Evolution, Stages & Levels

**Max level is 50.** Your champion passes through **20 life stages**:

Whelp → Hatchling → Pup → Cub → Youngling → Apprentice → Initiate → Novice →
Warrior → Veteran → Champion → Elite → Hero → Commander → Warlord → Exemplar →
Paragon → Ascendant → Mythic → **Legendary**.

**How do I evolve?** Fill the **Evolution Bar** (by feeding or adventuring). When
the bar is full **and** you're at a stage-gate level, the **Evolve** button
lights up — spend one Evolution Potion to transform to the next stage (the art
changes). The same NFT evolves in place; it doesn't become a new token.

**Time-gated levels (L20+):** 🧪 from level 20 on, each level-up starts a short
wait timer before you can advance again (it begins around 30 min and grows a
little each level, capped at a few hours). Adventures tick the timer down while
your champion is away. You can also **skip the wait for PYR** (about 1 PYR per
remaining minute).

---

## 6. Energy

Actions cost **energy** (max 100): Adventures and Arena fights each spend some.
Energy **regenerates over time** on its own (a full bar takes roughly a day), so
if you're tapped out, come back later or send your champion on a shorter
Adventure. You can't start an action if you don't have enough energy for it.

---

## 7. HP, Healing & Durability

- **HP** drops when you fight in the Arena (more on a loss than a win) and
  **regenerates over time**. You can top it up instantly with a **Healing Salve**.
- After every Arena fight there's a short **healing cooldown** (about 60s) — the
  Heal Now button appears automatically when the fight ends. (You no longer have
  to re-enter the Arena to see it.)
- **Weapons lose durability** as you fight and can be repaired at the repair shop.

---

## 8. Equipment

Champions have **5 gear slots**: Weapon, Armor, Trinket, Boots, Aura. Gear comes
in four rarities — **Common, Rare, Epic, Legendary** — and higher rarity gives a
bigger stat boost.

- **Weapons are species-locked** (each species has its own weapon designs, each
  with a unique signature effect).
- **Armor, Trinkets, Boots and Auras are cross-species** — any champion can use them.
- Gear is earned from **treasure chests / quests** and bought as **NFTs in the Shop**.

---

## 9. Arena (PvP)

**Match modes:**
- **vs Bots** — fight synthesized opponents. Always available.
- **PvP** — fight real players' loadouts from the global pool.

**Combat modes:**
- **Auto** — the fight auto-resolves from your stats, gear and abilities. No timing
  needed.
- **Active** — a quick pre-fight timing mini-game; nailing it boosts your damage
  (up to ~+15%).

**Battle stances:**
- **Aggressive** — +15% damage, −15% defense
- **Balanced** — no modifiers
- **Defensive** — −15% damage, +15% defense

**Abilities:** you pick **one** ability per fight (plus your automatic Bloodline
Signature):

| Ability | Effect |
|---|---|
| 💥 Power Strike | +30% damage on your first two hits |
| 🛡️ Iron Skin | Take 25% less damage in rounds 1–2 |
| 🚩 Rally | +10% damage per crit you land (stacks) |
| 🩸 Drain Touch | Heal 12% of damage dealt in the first 3 rounds |
| 💨 Quickstep | +20% dodge for the first 2 rounds |
| 🎯 Hunter's Mark | Your first crit hits +50% harder |
| 🪨 Stone Wall | The first two hits you take deal 50% less |
| 🩹 Pact of Blood | Sacrifice 15% HP at the start, gain +25% damage all match |

**Species affinity:** combat has a rock-paper-scissors element between species
(e.g. Fire beats Nature). A favorable matchup boosts your damage (~+30%); an
unfavorable one reduces it.

**Ranking:** wins/losses move your **ELO**, which sets your rank tier and your spot
on the leaderboard.

---

## 10. Adventures

Send your champion on a timed **Adventure** to earn stat XP and Evolution-Bar
progress. There are **8 zones**: Hunting Grounds, Ancient Ruins, Spirit Caves,
Treasure Crypts, Forge Pits, Moonlit Glades, Ember Wastes, Whisper Marshes — each
favors different traits.

- Pick a **duration**: Quick (~15 min), Standard (~1 hr) or Long (~4 hrs). Longer =
  more rewards and more energy.
- Adventures are **server-timed and async** — close the tab and come back; your
  champion keeps "training" and the level timer ticks down while away.

---

## 11. Campaign

A 5-chapter boss journey (Pit Trials → Bone Coliseum → Thornwood Hollow → Inferno
Throne → Voidlord's End). Each chapter is a few fights plus a boss; beating a boss
awards **treasure chests** and stat XP. You can replay chapters (chests are
one-time, but replays count toward weekly quests).

---

## 12. Bond & Mood

**Bond (0–100)** grows as you care for your champion — feeding, winning Arena
fights, completing Adventures and claiming your daily reward all add bond. Higher
bond unlocks visual flourishes and keeps your champion's mood up.

**Mood** reflects how recently you've interacted (fed / fought / adventured /
claimed daily):

| Mood | Roughly |
|---|---|
| 🥚 Newly hatched | brand new, low level |
| 😊 Happy | active in the last ~12h |
| 🙂 Content | ~12–24h |
| 🥺 Hungry | ~1–2 days idle |
| 😴 Restless | ~2–3 days idle |
| 😔 Neglected | 3+ days idle |

Mood is cosmetic — there's no stat penalty — but high bond keeps it from sliding
all the way down even if you're away a while.

---

## 13. Daily Streak

Claim once per day for a reward; the rewards run on a **7-day ladder** (then
repeat), with the best drops on **Day 5** (a Blessing) and **Day 7** (a big
bundle). Missing a calendar day resets your streak to day 1.

---

## 14. Quests & Treasure Chests

There are **daily, weekly, monthly and lifetime** quests covering nearly
everything you do — caring, winning, adventuring, evolving, collecting species and
bloodlines, climbing the leaderboard, and more. Completing one awards **treasure
chests**.

**Treasure chests** contain potions (trait Minors/Majors/Epics, Evolution
Potions, Blessings) and, at launch, gear. Rarer drops are weighted lower (Minors
are common; Epics are rare). 🧪 In QA, chest rewards are credited directly to your
inventory.

---

## 15. Pioneer Slots

A **Pioneer slot** is a founding-holder race: only the **first 10 wallets** to
take a given bloodline all the way to **Stage 20 (Legendary, L50)** become that
bloodline's Pioneers. On the adopt screen, "⭐ Pioneer slot #4 / 10 available"
means you'd be the 4th — once 10 wallets claim it, that bloodline's race is over.

- It completes the **"Bloodline Pioneer"** quest (reward: **3 treasure chests**).
- Applies to **any non-Ironfang** bloodline (Ironfang is the starter line).
- It's permanent founding-holder status, recorded across the Vulcan ecosystem.

---

## 16. Shop & Economy (PYR)

**PYR** is the in-game currency — the native coin of the Elysium chain.

**The Shop has three tabs:** Potions, Equipment, and ✨ Limited Drops.

- **Shop checkout now charges real PYR** from your connected wallet (to the game
  treasury). Make sure you're connected with a **funded Elysium wallet**. If you
  reject the wallet prompt or the transaction fails, **nothing is charged and
  nothing is delivered** — it's safe to cancel.
- **NFT items** (equipment, limited potions, champion eggs) are **batch-delivered
  to your wallet within a few days**, but you can **use the in-game item right
  away** — you don't wait on the chain to play.
- 🧪 **Renaming (5 PYR) and adopting (10 PYR) are still free** for now — only the
  Shop charges real PYR at this stage.

---

## 17. NFTs & Minting

- **One NFT per champion**, minted at level 1 as the baby. It **evolves in place** —
  the same token's art updates from stage 1 to stage 20 as it levels.
- **Champion supply:** 250 per bloodline (6,500 total) — half sold in the Shop,
  half dropped from treasure chests.
- **Equipment & limited-potion NFTs** have their own capped supplies, split between
  the Shop and chest/quest drops; rarer items are far scarcer.
- 🧪 During QA your champions and potions are database-backed so the full loop is
  playable now; they become on-chain NFTs at launch.

---

## 18. Leaderboard & Ranks

Your **ELO** places you on the leaderboard, with rank tiers climbing as you win.
You can open the leaderboard from the top bar and filter by species. Weekly
boards reset on a regular cadence.

---

## 19. Wagers

When you send a PvP challenge you can attach an optional **PYR wager** (0–10,000).
The winner takes the pot minus a small (5%) rake.

🧪 **Right now wagers settle on the QA ledger** (no real PYR moves) so the full
challenge → win → claim loop is testable. The on-chain escrow that holds real PYR
is built and staged but **not yet switched on** — it goes live at production
launch.

---

## 20. QA / Testing Notes — what's real vs simulated

| Feature | Status |
|---|---|
| Wallet sign-in (SIWE) | ✅ Real, on Elysium |
| Shop checkout | ✅ **Charges real PYR** |
| Adoption / Rename / Skip-timer | 🧪 Free (signed, no PYR deducted) |
| Champions & potions | 🧪 Database-backed in QA → NFTs at launch |
| Wager payouts | 🧪 QA ledger → on-chain escrow at launch |
| Energy, HP, Adventures, Campaign, Daily, Quests | ✅ Live |

---

## 21. Troubleshooting

- **I don't see a recent change / update.** Hard-refresh: **Cmd/Ctrl+Shift+R**. The
  site rebuilds a short while after each update.
- **My PYR balance looks wrong / off-chain.** Make sure your wallet is on **Elysium
  (chain 1339)**. The balance shown is your on-chain Elysium PYR.
- **The wallet didn't pop up at checkout, or I was charged but got no item.** Report
  it with your wallet address and roughly the time — that helps us trace it fast.
- **My champion is stuck and won't level past L20.** That's the time-gate — wait for
  the timer, send it on an Adventure to tick it down, or skip with PYR.
- **Blessing is greyed out.** Your champion doesn't have room for a full 40 stat
  points yet — level up to raise your caps, then use it so none are wasted.

---

_Found something this FAQ doesn't answer? Drop it in the QA channel and we'll add
it._
