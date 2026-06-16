# VulcanX Champions — Changelog (tester-facing)

_Changes go live a little after merge (the site rebuilds on a short delay) —
if you don't see something yet, hard-refresh (Cmd/Ctrl+Shift+R)._

## 16 Jun 2026
**Champion screen**
- Character art now sits **centred within the layout**, sized to fit between
  the side cards — the **whole figure (head to feet) is visible**, no more
  head cut-off or overflow. Soft-blended into the background (sides + bottom),
  head kept crisp.
- The character's environment is spread across the page as a blurred backdrop
  behind the cards (a true full-page scene would need every champion re-drawn
  as a wide image — this is the agreed compromise).
- **EVOLVE button** now uses a painted icon instead of the ⚡ emoji.
- **Evolution Milestones fixed**: no more "L51" (max level is 50); stage
  level-ranges read correctly.


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
