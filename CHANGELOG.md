# VulcanX Champions — Changelog (tester-facing)

_Changes go live a little after merge (the site rebuilds on a short delay) —
if you don't see something yet, hard-refresh (Cmd/Ctrl+Shift+R)._

## 20 Jul 2026 (later 3)
**Champion NFTs from chests — full pipeline** (404nomA, MidniteCatzlady)
- Chest-minted champion NFTs now materialise into your stable
  automatically: the game checks your wallet's champion NFTs on the VX
  marketplace at every login and creates any champion you own but don't
  have yet (bound to the NFT, no duplicates, works for marketplace buys
  and transfers too). You'll get an arrival popup when one lands.
  *(Waiting on one VX-side switch to go fully live — new chest drops are
  already delivered instantly via the chest pipeline meanwhile.)*
- 404nomA's Frostscale (Rimeclaw the Whelp) was delivered manually today.

## 20 Jul 2026 (later 2)
**Bond & Mood — cross-device sync** (AngelHorn's #5)
- Bond and Mood were stored only on each device, so your mobile browser and
  PC told different stories. They now sync through the server on every load
  and after every bond change: progress merges across devices (highest bond
  wins, care timestamps combine — nothing is ever lost), and Mood follows
  automatically. Feed on your phone, see it on your PC.

## 20 Jul 2026 (later)
**All four of AngelHorn's reports**
- **Campaign hang after fights** — same bug mrMinimal caught; fixed earlier
  today (result screen + Continue now always appear).
- **Energy now visible in Campaign** — the champion picker shows each
  champion's ⚡, and the stats line shows ⚡/100 and ❤️ HP (red when too low
  to fight) plus the 20⚡ fight cost.
- **Challenge from the Leaderboard** — every player row now has a ⚔️ Fight
  button (no more copy-pasting wallet addresses) and there's a search bar to
  find a champion or player by name. Works even if you haven't opened one of
  your champions first — the challenge sends with your first champion.
- **"100% Evolution Bar but no level-up after adventure"** — that champion is
  parked at a stage gate: the game wants you to EVOLVE before leveling
  continues. It just never told you. Now the adventure rewards popup says
  "Evolution Bar full — EVOLVE to keep leveling!", and sending a gate-parked
  champion on an adventure warns you first so bar rewards aren't silently
  wasted.

## 20 Jul 2026
**Campaign** (mrMinimal)
- **Fixed the freeze at the end of Active campaign fights.** If the server
  rejected the result (or your champion was too exhausted for it to count),
  the battle screen got stuck on the combat log with no buttons. The result
  panel and Continue button now always appear — including a new clear
  "NOT RECORDED" outcome when the fight didn't count (heal up and retry).
**Adventures** (Bergz)
- **Cross-device sync**: adventures claimed on one device no longer linger
  on your other devices with a dead Claim button ("already completed").
  Each device now reconciles with the server on load — claimed adventures
  disappear everywhere, running ones appear everywhere.
**Blessing/Adventure glow** (Acadian)
- **The ready-glow is now much stronger** — wider, brighter pulse plus a
  gold tint on the button itself, so it's visible at a glance.

## 19 Jul 2026
**Blessings — backfill for existing keepers** (Acadian)
- The "10 Blessings to start" change (17 Jul) only applied to brand-new
  wallets — everyone who adopted before it got nothing. Fixed: every
  existing keeper has been topped up to **at least 10 Blessings**. Already
  live — just reload the game. (Reminder: Blessings stay locked until your
  champion has room for the full 40 stat points — level up to unlock them.)

## 17 Jul 2026 (later)
**Guidance & starter pack** (Acadia + Ric)
- **Glowing "go here" buttons**: the Adventures button in the top nav now
  pulse-glows whenever at least one of your champions is ready to be sent
  (home + enough energy), and the Blessing bar on the champion page glows
  when a Blessing is usable. Same gold pulse the Evolve button already uses.
- **New keepers now start with 10 Blessings** in the free starter pack, on
  top of the 60 trait potions and 10 Evolution Potions (80 total).

## 17 Jul 2026
**Adventure send warning — reworded** (Acadia)
- The "traits already maxed" pre-send dialog no longer shouts at you: warning
  triangle and exclamation marks gone, STR/VIT spelled out as Strength and
  Vitality, and the message now reads like a heads-up, not an error. Buttons
  are "Choose Another" / "Send Anyway".

## 16 Jul 2026 (later)
**Quest popups**
- **No more "false joy" replays** (Coin1x1): logging in from a fresh
  browser/device replayed a big "Quest Complete" celebration for a quest
  you finished days ago (it showed whichever completed quest happened to
  be last in the list — e.g. Keeper of Bloodlines). The celebration memory
  was device-local, so a new device thought everything was new. Now: quests
  you already claimed on VulcanX never celebrate again anywhere, and a
  fresh device syncs silently instead of replaying history. No chests were
  ever duplicated — this was purely a popup bug.
- Also fixed a related server case where evolving a champion of a bloodline
  you'd already pioneered re-fired the "Bloodline Pioneer" toast each time.

## 16 Jul 2026
**Stats — species now actually matter** (server part is already live)
- **Champions no longer share one universal stat line.** Base stats at
  adoption and the stat caps at every level are now scaled by your
  bloodline: an Elf Nightshade caps AGI ~30% higher than baseline, a Dwarf
  Stonehammer caps VIT ~30% higher but AGI lower, and so on for all 26
  bloodlines. Before this, every champion pinned at the same numbers
  (25/30/35/15/20/40 at L1) no matter the species — bloodlines only changed
  how *fast* you got there, which nobody could see.
- **Nobody loses stats.** Champions already above a lowered cap keep every
  point (that trait just won't gain further until the cap catches up at
  higher levels). Newly adopted champions hatch with visibly different
  base stats per bloodline.
- The stat panel (X / cap) shows your champion's own bloodline-weighted
  caps once this build rolls; server-side caps, feeding, adventure rewards
  and evolution floors are live now.

## 15 Jul 2026 (later 2)
**Adventures**
- **Adventure recovery actually works now.** The restore-after-browser-close
  system shipped yesterday was being rejected by the server on every load (an
  authentication mismatch), so adventures still looked lost — while the "can't
  start a new adventure" error proved they were running server-side all along
  (exactly as Coin1x1 described). Fixed on the server — **works immediately,
  just reload the game** and your running adventures reappear.

## 15 Jul 2026 (later)
**Chest quests**
- **"✓ Claimed" now shows reliably** for quests claimed in the VulcanX dApp —
  the first version of this fix missed most quests because the dApp and the
  game name them slightly differently; the matching is now robust (verified
  against real claimed quests).

## 15 Jul 2026
**Wallet**
- **The WalletConnect button now actually shows on desktop** — it existed but
  was permanently hidden, so only MetaMask appeared. Desktop players can now
  scan the QR with any mobile wallet.
**Top bar**
- **Removed the fake G / V / E token counters** — they were placeholder numbers.
  Your real PYR balance chip stays.
**Chest quests**
- **Quests you've already claimed in the VulcanX dApp now show "✓ Claimed"**
  instead of still offering the Claim button.
**Equipment**
- **Every champion is armed automatically at login** — the free basic weapon of
  its species is granted for all your champions at once (no longer only when
  you open each one). Fixes "some players did not get basic equipment".
**Guide**
- **Equipment sources spelled out**: starter set, free basic per champion, Shop
  NFTs, and ecosystem chest drops — not just drop rates.
- Unified naming: "equipment slots" everywhere (was mixed "gear slots").

## 14 Jul 2026 (later 11)
**Wallet — mobile**
- **"Open in MetaMask" now opens the app, not the App Store.** The button used
  MetaMask's web link, which on phones was bouncing to the App Store even with
  MetaMask installed (thanks Ric). It now launches the installed app directly —
  and there's a new **"Open in another wallet"** button that hands the
  connection to any WalletConnect-compatible wallet on your phone.

## 14 Jul 2026 (later 10)
**Adventures** (thanks Coin1x1 — both fixed)
- **Running adventures no longer vanish when you close the browser.** They were
  only tracked on your device; now the server remembers them and they're
  **automatically recovered** when you come back — any browser, any device.
- **Difficulty is now visible.** Durations are labelled everywhere: **Quick ·
  Easy** (green), **Standard · Medium** (gold), **Long · Hard** (red) — in the
  send-adventure picker, on active adventure cards and in the rewards popup, so
  you always know which quest was which.

## 14 Jul 2026 (later 9)
**Equipment**
- **Every champion now gets a free basic weapon of its species** — automatically
  created and equipped the first time you open that champion. Previously only
  your first champion's species got starter weapons, so champions of other
  species could never equip anything (thanks Bergz). Open each champion once
  and they'll be armed.

## 14 Jul 2026 (later 8)
**Champion page**
- **Switch champions right from the dashboard.** The champion page (stats,
  equipment, feeding) now has the same styled champion dropdown as Adventures —
  no more round-trip through the Stable to jump between champions. Shows each
  champion's status; appears once you own 2+ (thanks AweSumOne).

## 14 Jul 2026 (later 7)
**Shop**
- **New "Only my species" filter on the Equipment tab** — tick it to hide
  species-locked gear none of your champions can wear (universal items always
  show). Your choice is remembered (thanks AweSumOne).

## 14 Jul 2026 (later 6)
**Equipment screen — now answers its own questions** (thanks AweSumOne)
- Renamed **Inventory → Equipment** (button + screen) and the header now lists
  the **five gear slots** (Weapon · Armor · Trinket · Boots · Aura).
- Every item shows **where it came from** — 🎁 Free starter gear or 🛒 Shop
  purchase (NFT) — and its slot.
- Every equipped item shows **which champion is wearing it** ("equipped on
  Vesper the Whelp"), not just a vague equipped state.
- **"+N power" is explained** in the header and on hover: it's the item's boost
  to a champion's Power Score while equipped.

## 14 Jul 2026 (later 5)
**Adventures**
- **The champion picker is now a proper game dropdown** — styled like the rest
  of the UI instead of a plain browser select, with each champion's status
  (⚡energy / on adventure / too tired) shown in the list and free champions
  sorted first (thanks AweSumOne).
**Champion page**
- **Out of potions? The Feed button now takes you to the Shop.** When your
  potions hit zero it says "🛒 Out of potions — tap to shop" and opens the Shop
  instead of just going grey (thanks AweSumOne).

## 14 Jul 2026 (later 4)
**Equipment**
- **Starter weapons now match your champion's species.** If your first champion
  wasn't an Orc, your free starter set still contained 3 Orc weapons you could
  never equip (thanks Coin1x1). Fixed — and if you already have the wrong ones,
  they're **automatically swapped** for your species' weapons (same rarities)
  the next time the app loads. Equipped items and purchased NFTs are never
  touched.

## 14 Jul 2026 (later 3)
**Champion page**
- **Equipment slots got painted icons too** — Weapon, Armor, Trinket, Boots and
  Aura now show painted art (crossed blades, embossed breastplate, arcane ring,
  adventurer boots, radiant sigil) instead of emoji, in the champion panel and
  the equip picker.

## 14 Jul 2026 (later 2)
**Adopt**
- **The Choose-Your-Species screen got real artwork.** The eight generic emoji
  are replaced with **hand-painted fantasy emblems** — a war-scarred orc
  chieftain, moonlit elf, hooded goblin rogue, blazing flame paladin, drakkin
  dragon, rune-forged dwarf, feral beastkin and a star-crowned spirit-warrior —
  in the same painted style as the rest of the game's art.

## 14 Jul 2026 (later)
**Shop**
- **Every item now shows who can use it.** Equipment tiles have a clear badge —
  e.g. **🟢 Orc only**, **🐉 Drakkin only** — and universal items say
  **✨ Any species**. The tooltip spells it out too ("Equippable by Drakkin
  champions ONLY"), so no more guessing which race an item belongs to.

## 14 Jul 2026
**Shop — weapon & equipment purchases FIXED** ⚔️
- Buying weapons/equipment **always failed** with a database error (a bug in the
  purchase function — it had literally never worked). Fixed and verified with a
  real end-to-end purchase: payment → queued for NFT delivery → stock counts
  down. If you paid for a weapon before this and got an error, ping us with
  your tx hash and we'll make it right.
**Leaderboard**
- **One entry per player** — the board now shows each wallet's **best champion**
  only, instead of one row per champion (thanks Day Devil). Applies to both
  all-time and weekly boards, live now.

## 13 Jul 2026
**Adopt — your payment can never be lost again** 🛡️
- Previously, if the mint failed *after* your 20 PYR payment went through, the
  PYR was gone and no champion arrived (this happened to a real player — being
  made whole). Now: the payment + your species/bloodline choice are **saved
  before minting**, the mint **retries automatically**, and if it still fails
  your champion is **minted automatically on your next visit** — one mint per
  payment, verified on-chain, you can never be double-charged.
- The server now **verifies adoption payments on-chain** (right amount, right
  wallet, to the treasury, confirmed) before minting.

## 9 Jul 2026 (later)
**Adventures**
- **No more stuck "error when claiming".** If a claim went through but the
  response got lost (double-tap / flaky connection), every retry used to error
  forever. It now recognises the rewards were already granted, clears the
  adventure, and refreshes your champion — "All good!".
**FAQ**
- **Rewritten to actually answer the questions** — real numbers throughout:
  20 PYR adopt (+ free starter pack), 3/8 PYR potions with exact effects, how
  levelling & the 20 stages work, energy costs & the 10 PYR recharge, adventure
  reward ranges, PYR wagers (95% to the winner), and how to earn chests.
**New players**
- Starter pack finalised: 10 potions per trait + **10** Evolution Potions.

## 9 Jul 2026
**Wallet**
- **WalletConnect rebuilt on the flow that already works in Vulcan Runner.** The
  built-in WalletConnect popup has a known bug (it opens with an empty QR code
  that never connects). Champions now shows its own pairing screen — a working
  **QR code** to scan on desktop plus an **"Open in MetaMask app"** button on
  mobile, with a copy-link fallback.
**Landing page**
- Removed the outdated "testing phase / no PYR deducted" wording — the game
  charges real PYR now, and the copy says so plainly (every charge is confirmed
  in your wallet first). Swept the guide's remaining "free in QA" lines too.
**New players**
- **Free starter pack with your first champion:** 10 potions of every trait
  (60 total) + **20 Evolution Potions**, granted automatically the moment you
  adopt your first champion.
**Adventures**
- Hardened the claim path further — a rare raw database error on claim now
  returns a clear message instead.

## 8 Jul 2026 (later 3)
**Champions restored + payment protection**
- **If your adopted champion vanished today, it's back.** The test-phase reset
  accidentally included champions that players had paid 20 PYR to adopt — all
  of them (6 players, 16 champions, plus their potions) have been restored from
  backup. Sorry about the scare.
- **Paid adoptions are now recorded on the champion itself** (payment tx hash),
  so paid champions can never be swept up in a data reset again.

## 8 Jul 2026 (later 2)
**Adventures**
- **Fixed "Claim failed: quest_not_found" on old adventures.** If a champion was
  reset while it had an adventure in progress, claiming it errored with a raw
  message. Now the stale adventure is cleared automatically (and pruned on the
  Adventures screen), with a clear "this adventure is no longer available" note
  instead of the error.

## 8 Jul 2026 (later)
**Wallet**
- **WalletConnect now works on mobile.** The connection was requiring the Elysium
  chain up-front, which mobile wallets that don't already have Elysium (most of
  them) couldn't approve — so the pairing failed. It now connects on a chain every
  wallet supports and switches to Elysium automatically when you make a
  transaction. (Also fixed the Add-Network prompt to say **PYR**, not the old
  "LAVA" label.)

## 8 Jul 2026
**Adventures & Arena**
- **Champion pickers now show who's actually free.** The dropdowns (Adventures,
  Arena, and accept-a-challenge) annotate every champion with its status —
  **⚡energy**, **🗺️ on adventure**, or **too tired** — and sort the free ones to
  the top, so you don't have to open each champion to see who can go (thanks Bergz).
- **Heads-up when a quest would be wasted.** If you send a champion on an
  adventure whose main traits are already **maxed for its level**, you now get a
  warning (stat points would be wasted — only Evolution-Bar fill) with the option
  to send anyway or pick another (thanks Bergz & Ric).

## 24 Jun 2026 (later 2)
**Arena**
- **The enemy's shown level now matches its stats.** The arena was displaying the
  opponent at *your* champion's level while its stats were its own — so a PvP
  opponent of a different level looked like its stats didn't fit its level. The
  enemy now shows its **own** level (bots mirror your level; PvP opponents show
  their real level), so the level and stats line up.

## 24 Jun 2026 (later)
**Energy**
- **Full Energy Recharge is now one clear action.** It was both a Shop item *and*
  a champion-page button, which was confusing — buying it in the Shop didn't give
  you something to "use", so the champion button looked like it was charging you
  again. Removed the Shop version; the **⚡ Full Energy Recharge · 10 PYR button
  on the champion page** (right under the Energy bar) is now the single way to do
  it — one tap, pay 10 PYR, instantly full.
**Wallet**
- **The wallet now pops up to reconnect automatically.** When your session had
  quietly expired (idle/phone-sleep), an action would just error with "please
  reconnect" and you had to manually disconnect + reconnect. Now it actively
  re-opens MetaMask (or WalletConnect) so you can approve and continue.
**Arena**
- **Enemy stats now mirror your champion's for its level** (with a small ±12%
  swing so some are a touch weaker/stronger) — instead of drifting far from you.

## 24 Jun 2026
**Champion / Potions**
- **Blessing & Evolution potions now work on any champion.** They were still
  throwing a species "mismatch" error on cross-species champions (the universal-
  potion change had only covered trait potions) — fixed, all potion types are
  now truly universal.
**Champion page**
- **New "⚡ Full Energy Recharge · 10 PYR" button** right under the Energy bar —
  instantly tops the champion to full (no need to dig through the Shop).
**Arena**
- **Bot opponents vary more in strength.** They're still matched to your level/
  stage, but with a wider spread so you'll face some that are weaker and some
  tougher, instead of near-mirror matches every time.

## 23 Jun 2026 (later 5)
**Arena**
- **Toggle rows are now properly proportionate.** Match Mode / Combat Mode /
  Battle Stance now stack as centred rows with **every button the exact same
  size** — the Battle Stance group no longer renders wider ("huge on the right")
  than the others. The old side-by-side desktop layout couldn't fit three
  readable Battle-Stance buttons without that group ballooning; stacked + equal
  buttons is balanced at every screen width.

## 23 Jun 2026 (later 4)
**Arena**
- **Match Mode / Combat Mode / Battle Stance toggles now line up at all sizes.**
  Below the wide-desktop layout, the 2-button rows and the 3-button Battle Stance
  row were sizing their buttons differently — so the stance buttons were narrower
  and their icons looked bigger. Every toggle button is now the same width.
**Potions**
- **Your potions now show on every champion, including newly-adopted ones.** The
  champion screen was only loading potions tagged to that champion's species, so
  a new champ of a different species saw an empty bag. It now loads your whole
  shared potion inventory (potions are universal).
**Adventures**
- **The shown Evolution-Bar fill % now matches what you actually get:** Quick
  **1–3%**, Standard **5–7%**, Long **10–15%** (the UI was showing old values).

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
