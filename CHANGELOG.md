# VulcanX Champions — Changelog (tester-facing)

_Changes go live a little after merge (the site rebuilds on a short delay) —
if you don't see something yet, hard-refresh (Cmd/Ctrl+Shift+R)._

## 23 Jun 2026 (later 3) — Economy rebalance ⚖️
**Potions**
- **One potion per trait now** — the Minor / Major / Epic tiers are gone. Every
  trait potion gives a **flat +15** to its stat. (Any old Major/Epic potions
  still in your bag also give +15 now.)
- **Real PYR prices:** trait potions **3 PYR**, Evolution Potion & Blessing
  **8 PYR** each. Potions are no longer free in QA — they charge real PYR from
  your wallet (and land instantly).
**Energy**
- New shop item: **Full Energy Recharge — 10 PYR** (instantly tops your active
  champion to 100 energy). Pairs with the 4/hr passive regen.
**Adopt**
- Adopting a champion now costs **20 PYR** (was free in QA).

## 23 Jun 2026 (later 2)
**Arena**
- **Battle Stance icons no longer look bigger than Match/Combat Mode.** The
  stance emblems were drawn edge-to-edge in their image files while the mode
  icons had padding, so at the same size the stance ones rendered ~20% taller.
  Re-normalized all 7 toggle icons so every icon reads the same size. _(Hard
  refresh if you still see the old art.)_
- **Wager accept is safer:** if your stake deposits on-chain but the battle
  can't finish resolving (network blip), you now get a clear "your PYR is safe
  in escrow" message (with where to find the result / refund) instead of a bare
  error. No PYR is ever lost.
**Energy**
- Fixed the on-screen text that still said energy regenerates **+5/hr** — it's
  **+4/hr** (the actual rate; the text was just stale).
**Potions**
- Re-confirmed **potions feed any champion, new or old** (universal) end-to-end.

## 23 Jun 2026 (later)
**Arena — wager 5% rake now shows correctly** 🎲
- The **5% rake is now reflected everywhere** in the wager UI. It was always
  taken on-chain (the winner really did get 95%), but the *displayed* winnings
  rounded the rake down to zero on small wagers — so a 1 PYR wager showed
  "win 2 PYR" instead of **1.9**. Invite cards, the win screen and the claim
  message now all show the true post-rake amount (e.g. **1.9 / 3.8 / 15.2 / 95**).

## 23 Jun 2026
**Leaderboard & weekly quests**
- **Weekly reset moved to Monday 00:00 UTC (midnight)** — it was Monday 16:00 UTC
  (4pm GMT). The weekly leaderboard window and the chest-quest weekly bucket now
  both roll over at the start of Monday. New window opens immediately, scores
  start from 0.

## 22 Jun 2026
**Arena**
- **Battle-log champion portraits now show the full character** (head to feet) —
  they were cropped to a square before.
- **Enemy champion picture now loads reliably on mobile** — it was sometimes
  blank because the (uncached) enemy art had no load-retry; added one.
**Adventures**
- **Adventure Evolution-Bar fill reduced** for slower, more deliberate levelling:
  Quick ~1–3%, Standard ~5–7%, Long ~10–15%.
**Energy**
- **Energy now regenerates at 4/hour** (was 5) — a full bar in ~25h.
**Potions**
- **Potions are now universal** — any potion feeds *any* of your champions,
  new or old (no longer species-locked). One shared inventory across your stable.

## 21 Jun 2026 (later)
**Arena — PYR wagers are LIVE on-chain** 🎲
- When you send a PvP challenge you can now attach a **real PYR wager** (up to
  **50 PYR** during the launch soak). Both sides' stakes are **escrowed in a
  smart contract on Elysium**; the winner claims **95% of the pot** (5% rake).
- Connect a funded Elysium wallet to wager. Reject the wallet prompt and nothing
  is staked.

## 21 Jun 2026 (later)
**Guide**
- The six **stat icons are now painted game icons** (not emoji) — in both the
  stats grid and the potion-trait list. More of the guide's emoji will follow.
- Fixed a stale line that said potion gains "decay" — they're flat (+5/+15/+40).

**Stable**
- Champion card art is now centred (removed a slight vertical bias).

## 21 Jun 2026
**Champion**
- **Blessing works again on fully-maxed champions** — if every stat is at its
  cap you can still use it for the **Evolution-Bar fill** (you just won't spend
  stat points). It only stays locked when *partly* capped (to avoid waste).

**Arena**
- **Battle Stance icons are now the same size as Match/Combat** — the Balanced
  emblem was reading bigger; the icon art is now normalized so all toggle icons
  match.

**Shop**
- **Trimmed the intro text** so the potions show higher up — less scrolling to
  reach the actual shop, especially on mobile.
- **Potion bottles are now a uniform size** — the middle column (Vitality /
  Intelligence) no longer looks bigger. _(If you still saw old art, that was a
  caching issue — now fixed so updated art always loads.)_

## 20 Jun 2026
**Arena**
- **Match Mode / Combat Mode / Battle Stance now line up on desktop too.** On
  wide screens the three sit side-by-side; the Battle Stance group was being
  squeezed narrower (so its icons looked bigger) — all toggle buttons are now
  the same width. (The earlier fix only covered narrow/phone layouts.)

**Stable**
- **You can now own up to 100 champions** (was 10) — collect all 26 bloodlines
  with room to spare. _(Takes full effect once the backend cap is deployed.)_

**Adopt**
- The adopt button no longer says "10 PYR" — adoption is **free in QA** (10 PYR
  at launch), so the label now matches. You still sign a quick (free) wallet
  message to confirm the adoption.

**Shop / potions — QA testing unblocked**
- **Every species now gets a free 80-potion starter pack** the first time you
  open one of its champions (was Orc-only) — so Elf, Drakkin, etc. are
  immediately feedable. (Potions are species-specific, so each species needs
  its own.)
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
