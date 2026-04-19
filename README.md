# VulcanX Champions — User App

Live: **https://jamie323.github.io/vulcanx-champions-user/**

The user-facing companion-collecting app for VulcanX. Complement to the admin demo at https://jamie323.github.io/vulcanx-champion-mvp/.

## User flow

1. **My Stable** — landing page. Grid of owned champions, or "Adopt your first" CTA if empty.
2. **Adopt New** — 3-step flow:
   - Choose species (8 options: Orc, Elf, Goblin, Hellknight, Drakkin, Dwarf, Beastkin, Spirit-Warrior)
   - Choose bloodline (3 per species)
   - Confirm + name + "Adopt (5 PYR)" → adds to stable
3. **Champion Detail** — feed potions, evolve, animate at L50. Only reachable by clicking an owned champion.
4. **Explore** — leaderboard + see other players' champions, filtered by species.

## What's NOT shown to users

- Species tabs in top bar (admin-only)
- Bloodline sub-picker in champion view (admin-only)
- Admin mode toggle
- Browse any creature without ownership

## Persistence

Champions stored in `localStorage` for MVP. When the backend lands (see the main PoC repo's `BACKEND.md`), this swaps to Supabase edge functions — no UI rewrite.

## Max 10 champions per wallet. Permanent NFTs. Species-locked potions.

See the private PoC repo at `~/VulcanX-Avatar-PoC/` for full specs, art pipeline, and balance tables.
