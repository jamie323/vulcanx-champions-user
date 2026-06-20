# VulcanX Champions — Changelog (tester-facing)

_Changes go live a little after merge (the site rebuilds on a short delay) —
if you don't see something yet, hard-refresh (Cmd/Ctrl+Shift+R)._

## 20 Jun 2026
**Shop / potions — QA testing unblocked**
- **Trait, Evolution and Blessing potions are now free during QA** so you can
  level up any of the new species without spending PYR. NFT items (equipment,
  limited drops, eggs) still charge real PYR.
- **Potions are now granted for your current champion's species** — buying
  potions while playing an Elf gives you Elf potions (before, the shop only ever
  handed out Orc potions, so they wouldn't feed other species).
- Reminder: potions are species-specific — Orc potions only feed Orcs, etc.

**Guide & FAQ**
- Fixed the feeding tip: stat gains are **flat** (+5 Minor / +15 Major / +40
  Epic) — the old "diminishing returns" text was stale.
- **Special potions** section now also covers the **Healing Salve**, the
  Blessing's "needs room for 40 points" rule, and points to the Limited Drops.
- "What's real vs dummy in QA" updated: **real PvP**, **Shop charges real PYR**,
  wagers on the QA ledger.
- A full **player FAQ** covering the whole game is now written up (going on the
  site soon).

## 19 Jun 2026
**Adopt — all species & bloodlines unlocked** 🎉
- **You can now adopt any of the 8 species and all 26 bloodlines** — every one
  has its own full 20-stage art (no more "Coming soon" locks, no placeholders).
  Orc, Elf, Goblin, Demon, Drakkin, Dwarf, Beastkin and Wraith are all live.
- Adoption is still free in QA (signed in your wallet, no PYR deducted).

**Champion screen**
- **Inside the Blessing window, Apply is now grayed out and unclickable until
  you've distributed all your points** (it was clickable with 0 points
  assigned). The button clearly shows as locked with "X pts left".
- **Blessing is now grayed out + locked until your champion has room for a full
  40 stat points.** A Blessing always grants 40 points, so using it near your
  stat cap wasted points — it now stays locked (with a "level up first" hint)
  until there's room, and tells you how much room you have if you tap it early.

**Arena**
- **Match Mode, Combat Mode and Battle Stance rows now line up** — same button
  size, same icon size, and the rows share the same width so their edges align.
  The Battle Stance buttons were taller than the mode rows and the Balanced
  emblem looked oversized; both are now consistent.

**Shop — real PYR payments are LIVE**
- Shop checkout now **charges real PYR** from your connected wallet on Elysium
  (chain 1339). Make sure you're connected with a **funded wallet** before
  buying. If you reject the wallet prompt or the transaction fails, **nothing is
  charged and nothing is delivered** — it's safe to cancel.
- The "no PYR deducted in QA" notes in the Shop have been updated to reflect this.
- _Rename (5 PYR), Adopt (10 PYR) and Skip-timer are still free for now_ — only
  the Shop charges real PYR at this stage.

## 18 Jun 2026
**Arena**
- The **healing cooldown now appears automatically when a fight ends** (with the Heal Now button) — no need to click “Enter Arena” again to see it.
- Match Mode, Combat Mode and the ability picker now use **painted game icons**
  instead of emoji, and the three toggle rows line up (balanced stance no
  longer looks bigger).
**Champion screen**
- Mood wording now **matches the Guide** and reflects any activity (feed /
  fight / adventure / daily), not just feeding.
- **Bond & Mood** decays Happy → Content → Hungry → Restless → Neglected based on the last time you fed, fought, adventured, or claimed daily (fixes maxed/idle champs stuck on "Content").

## 17 Jun 2026
**Champion screen**
- The champion image now **scrolls with the page** (it was staying fixed /
  "left behind" while everything else scrolled).
- The character is **aligned with the Champion + Stats cards** at the top.

## 16 Jun 2026
**Champion screen**
- The character art now stops **above** the Feed/Evolve + Milestones bars (no longer overlaps them).
- **Mobile:** the champion is now shown as a clear image at the top of the screen (it was only appearing as a faded background before).
- The character is now a **big, centred hero** — the full figure (head to
  feet) is visible, with its environment spread across the page behind the
  cards (sides blurred). No frame box, and it no longer sits "far down" — it's
  the centrepiece on desktop and mobile.
- **Evolution Milestones**: the final stage now reads **L50** (was "L49–L50").
- **EVOLVE button** uses a painted icon (was the ⚡ emoji).
- Earlier milestone fix: no more "L51" (max level is 50).

**Leaderboard**
- Fixed the **double-scroll** for real — the background page no longer scrolls
  behind the open leaderboard (the lock was being applied to the wrong element
  before). Affects desktop + mobile.


## 15 Jun 2026
**Adventures**
- Full redesign: cinematic banner up top, a unique painted image for every
  adventure (Hunting Grounds, Ancient Ruins, Spirit Caves, Treasure Crypts,
  Forge Pits, Moonlit Glades, Ember Wastes, Whisper Marshes), and a clear
  **Send Champion** button on each card.
- Removed the **"difficulty"** rating + per-card energy range (it was
  misleading — energy/time are set by the duration you pick, not the
  adventure).

**Champion screen**
- The champion's artwork now spreads across the whole page as a vivid
  backdrop with the character feathered in (replaces the flat black / boxed
  look).

**Leaderboard**
- Fixed the **double-scroll** on mobile (the page no longer scrolls behind
  the leaderboard list).

**Visuals (emoji → painted icons — IN PROGRESS, partial)**
- Started replacing emoji with painted game-asset icons. Done so far: topbar
  Shop, daily streak, Adventures banner + Browse, Feed button, Blessing bar,
  champion Energy/Health, Evolution Potion, Evolve button.
- Still emoji (not yet converted): much of the rest of the app — this is an
  ongoing sweep, not finished.

## 12–13 Jun 2026
**Arena**
- Final battle-screen layout: enlarged character, "Enter Arena" moved to the
  right under abilities, champion name + details on the top row.

---
### Known / in progress (not yet shipped)
- **Wager → smart contract**: parked for now; wagers still settle via the QA
  ledger during testing (on-chain escrow goes live at production launch).
- **Leveling & adventure balance** (stats-maxed-before-level, slower
  progression, more stat XP / less evo fill): under review — design decision
  pending.
- **Guide page redesign** (unify emoji + add imagery): queued.
