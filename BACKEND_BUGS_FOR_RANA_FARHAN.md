# Two QA bugs — both root-caused to backend / shared infra (not the Champions frontend)

Testers (Ric O., AngelHorn) reported these against champions.vulcan-x.io. I traced both
through the client AND the backend edge functions. Neither is a Champions-frontend bug —
they need backend work. Evidence below.

---

## Bug 1 — Wager "Claim PYR" doesn't work

**Symptom:** Win a wagered Arena match → no working way to claim/collect the PYR.

**Root cause (backend):**
1. The frontend's claim button calls edge function **`claim_wager_reward` — which does not exist.**
   There is no such function under `backend/supabase/functions/`. The click errors out.
2. Settlement is computed in `pvp_invite_accept` but **no PYR actually moves.** Direct quote
   from `pvp_invite_accept/index.ts` (~line 271):
   > "payout amounts on the audit log; no actual PYR moves until the on-chain escrow
   > contract lands. 5% rake to treasury on payout."
3. There is **no PYR balance table** anywhere in the migrations.
4. Live Arena (`match_request`) doesn't handle wagers at all — only the invite/challenge flow does.

**What's needed:**
- The on-chain PYR escrow/settlement contract (the known blocker), AND
- A real `claim_wager_reward` endpoint (or auto-credit at match resolution) that actually
  moves the payout (`payout_pyr = wager*2 - 5% rake`) to the winner.
- Until then, the claim button is non-functional by design.

**Frontend status:** The button + handler exist (arena result modal). I'm holding a cosmetic
change (honest "winnings pending escrow" messaging instead of a dead Claim button) until the
backend lands — say the word if you'd rather I ship that interim.

---

## Bug 2 — Desktop & mobile show different champions for the SAME MetaMask wallet

**Symptom:** Same single MetaMask wallet, but desktop and mobile don't show the same champions.
Ric also reports the **identical sync problem in Runner** (power-ups + coins not synced).

**Root cause (shared SSO / wallet-auth layer — NOT Champions code):**
- Client lowercases the wallet everywhere: `getWallet()`, on connect (`.toLowerCase()`),
  SSO verify, cross-tab sync.
- Backend lowercases everywhere too: `champions_auth.requireWalletFromQuery` /
  `requireWalletFromBody` both return `w.toLowerCase()`.
- `champion_list` queries `.eq("wallet_address", <lowercased wallet>)`.
- Champions are **always fetched fresh from the server** — nothing cached client-side.

=> Same wallet address ALWAYS returns the same champions. So if two devices differ, the
devices are resolving to **different wallet identities / SSO sessions** before the query
even runs.

**The Runner data point is the tell:** Runner is a separate codebase. It sharing the exact
same desktop/mobile desync points squarely at the **shared SSO / wallet-session layer**, not
either game's frontend.

**What's needed (Rana/Farhan):**
- Audit the shared wallet/SSO session: confirm desktop and mobile resolve to the **same
  lowercased wallet** for one MetaMask account.
- Likely suspects: mobile (MetaMask in-app browser / WalletConnect) binding a different
  account or minting a separate SSO token than the desktop extension; or the SSO token →
  wallet mapping differing per device.
- A fix here should also resolve Runner's power-up/coin desync (same layer).

---

## Summary

| Bug | Layer | Owner | Blocker |
|-----|-------|-------|---------|
| Wager claim | Backend | Rana/Farhan | On-chain escrow contract + `claim_wager_reward` endpoint (no PYR moves today) |
| Desktop/mobile champ sync | Shared SSO/wallet-auth | Rana/Farhan | Devices resolve different wallet identities; same issue affects Runner |

Frontend is verified correct on both. Happy to add interim client messaging for Bug 1 if useful.
