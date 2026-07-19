# Champions — VX Chest Consumables Catalogue (§3.2 of VX_CHEST_CONSUMABLES_SPEC)

**2026-07-18 · Jamie** — fills the "Champions team to fill" section of the
chest-consumables spec. Same model as Runner: non-NFT, pure data, chest resolver
calls the game's grant route with `{ wallet, id, qty }`, idempotent on the
chest-open id.

**Scope note:** this is ONLY the database-backed consumables. The Limited Drops
(Founder's Elixir, Stage Skip, Phoenix Tear, Bond Bloom, Whispered Trinket) are
capped-supply **NFT** potions — if those go in chests, they go the NFT chest
route (chest-wallet editions), NOT this grant contract.

## Catalogue

Trait potions are per-trait SKUs: pattern `potion_{tier}_{trait}` where
`trait ∈ str | vit | agi | fer | int | lck` — 18 concrete ids total. A chest roll
picks a specific id (recommend: uniform-random trait at the rolled tier, so
chests don't bias builds).

| id | item | type | suggested chest rarity | trigger / effect |
|---|---|---|---|---|
| `potion_minor_{trait}` (×6) | Minor trait potion | consumable (qty) | common | +5 to that trait when fed (bloodline-weighted); credited to the wallet's potion inventory, shows in Champion Detail feed screen |
| `potion_major_{trait}` (×6) | Major trait potion | consumable (qty) | uncommon | +15 to that trait when fed; same crediting |
| `potion_epic_{trait}` (×6) | Epic trait potion | consumable (qty) | **rare** | +40 to that trait when fed; same crediting (40 PYR shop value — keep drop rate low) |
| `evolution_potion` | Evolution Potion | consumable (qty) | **rare** | consumed at a stage-gate level with a full Evolution Bar to advance the champion one stage |
| `blessing` | Blessing | consumable (qty) | **rare** | 40 stat points distributed freely + 10–25% Evolution Bar; stays locked until the champion has room for all 40 points |
| `healing_salve` | Healing Salve | consumable (qty) | common | instantly restores champion HP after Arena fights |

Concrete id list for the chest tables (24 ids):

```
potion_minor_str  potion_minor_vit  potion_minor_agi  potion_minor_fer  potion_minor_int  potion_minor_lck
potion_major_str  potion_major_vit  potion_major_agi  potion_major_fer  potion_major_int  potion_major_lck
potion_epic_str   potion_epic_vit   potion_epic_agi   potion_epic_fer   potion_epic_int   potion_epic_lck
evolution_potion  blessing  healing_salve
```

## Grant route

Champions backend exposes the same contract as Runner (spec §4):

```
POST {champions-backend}/chest-grant
{ grant_id, wallet, items: [{ id, qty }] }
```

- HMAC-signed (`X-VX-Signature`), server-to-server only.
- Idempotent on `grant_id` — replays return the original result, no double-credit.
- Wallet that has never opened Champions: grant parks as pending and applies on
  first load (Runner's `pending_player` pattern).
- Route implementation is on the Champions backend (Rana) — mirror Runner's
  edge fn; URL to follow once live.

## Economy notes

- Shop prices for reference (drop-rate tuning): Minor 5 PYR · Major 15 PYR ·
  Epic 40 PYR. An Epic drop is a 40-PYR-value item — rare tier is deliberate.
- Potions live in the WALLET's inventory and are champion-agnostic (the player
  picks which champion to feed), so grants never need a champion id — wallet only.
- No level/stage currencies exist outside potions — nothing else to drop.
