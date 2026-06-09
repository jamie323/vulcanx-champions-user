# Champions NFT Evolution System — Handoff to Farhan

## Overview
We're minting **5,500 Champion NFTs** across **22 bloodlines** (250 per bloodline, 50/50 shop/chests). Each NFT evolves through **20 stages (Whelp → Legendary)** by paying gas to increment the on-chain level counter.

---

## Minting Spec
**File:** `nft_minting_spec_final.json`

### Supply
- **Total NFTs:** 5,500
- **Bloodlines:** 22 (Orc: 4, Elf: 3, Goblin: 3, Flame Paladin: 3, Drakkin: 3, Dwarf: 3, Beastkin: 3)
- **Per bloodline:** 250 NFTs
  - 125 → Shop (purchasable with PYR)
  - 125 → Treasure Chests (loot drops)

### Removed Bloodlines
- Orc: Tuskborn ❌
- Spirit-Warrior: Skyweaver, Voidstalker, Sunspire ❌

### SKU Naming
- Format: `champion_{species_key}_{bloodline_key}`
- Example: `champion_orc_ironfang`, `champion_elf_sunweaver`

### Pricing by Tier
- **Acquisition** (easiest/rarest): 150 PYR — Ironfang, Iron-Tooth, Ironbeard
- **Standard** (balanced): 200 PYR — Most bloodlines
- **Premium** (powerful): 300 PYR — Sunweaver, Frostscale, Goldseeker, Voidstalker, Sunspire

---

## NFT Evolution Mechanics

### Key Principle
**One NFT token, multiple stages.** The NFT itself doesn't change; only the on-chain `level` number increments.

### Lifecycle

#### 1. **Minting (Initial State)**
- Mint all 5,500 NFTs with:
  - `tokenId` = unique identifier
  - `bloodline` = set at mint
  - `level` = **1** (Whelp stage — baby)
  - `owner` = recipient (shop buyer or chest loot recipient)

#### 2. **Evolution (On-Chain Level Increment)**
User pays gas to call contract function:
```solidity
function evolveChampion(uint256 tokenId) external payable {
  require(msg.value >= estimatedGas, "Insufficient gas funding");
  require(champions[tokenId].level < 20, "Already max level");
  champions[tokenId].level += 1;
  // Emit event for metadata refresh
  emit ChampionEvolved(tokenId, champions[tokenId].level);
}
```

**Frontend Guard:**
```javascript
// Before showing "Evolve" button:
const estimatedGasCost = estimateGas(evolveChampionTx);
const userBalance = await wallet.getBalance();
const hasEnoughGas = userBalance >= estimatedGasCost;

if (!hasEnoughGas) {
  showMessage(`Need ${formatGas(estimatedGasCost)} PYR for evolution`);
  disableEvolveButton();
}
```

#### 3. **Image Rendering (Dynamic Based on Level)**
NFT metadata is returned **dynamically** from an endpoint:

```
GET /api/champions/metadata/{tokenId}

Response:
{
  "name": "Grokk Ironfang - Warrior",
  "image": "evolution20/orc/ironfang/s09.png",  // Level 9 image
  "stage": "Warrior",
  "level": 9,
  "description": "...",
  "attributes": [...]
}
```

**Image File Mapping:**
- Level 1 (Whelp) → `s01.png`
- Level 2 (Hatchling) → `s02.png`
- ...
- Level 20 (Legendary) → `s20.png`

**All images pre-exist in:**
```
evolution20/{species_key}/{bloodline_key}/s{level:02d}.png
```

---

## Smart Contract Requirements

### Champion Token Storage
```solidity
struct Champion {
  uint256 tokenId;
  string bloodline;     // "ironfang", "moonsong", etc.
  string species;       // "orc", "elf", "goblin", etc.
  uint8 level;          // 1-20
  address owner;
  uint256 mintedAt;
}

mapping(uint256 => Champion) public champions;
```

### NFT Metadata Endpoint
The `tokenURI` for each NFT should point to:
```
{baseURI}/api/champions/metadata/{tokenId}
```

Not a static JSON file — this must be a **dynamic endpoint** that:
1. Queries the on-chain `level` from `champions[tokenId]`
2. Constructs the image path based on level: `evolution20/{species}/{bloodline}/s{level:02d}.png`
3. Returns full metadata with current stage name, attributes, etc.

### Functions Needed
- `mint(address to, string bloodline, string species)` — Mints NFT with level=1
- `evolveChampion(uint256 tokenId)` — Increments level (with gas payment validation)
- `getLevel(uint256 tokenId)` → uint8 — Returns current level
- `getBloodline(uint256 tokenId)` → string — Returns bloodline name
- `tokenURI(uint256 tokenId)` → string — Returns dynamic metadata URL

---

## Frontend Implementation

### Evolution Button Logic
```javascript
async function handleEvolveClick(championNFT) {
  // 1. Estimate gas
  const estimatedGas = await estimateEvolveGas(championNFT.tokenId);
  const gasInPYR = gasPrice * estimatedGas;
  
  // 2. Check balance
  const userBalance = await wallet.getBalance();
  if (userBalance < gasInPYR) {
    alert(`Insufficient gas. Need ${gasInPYR} PYR, have ${userBalance} PYR`);
    return;
  }
  
  // 3. Allow evolution
  const tx = await contract.evolveChampion(championNFT.tokenId);
  await tx.wait();
  
  // 4. Refresh metadata display
  const newMetadata = await fetch(`/api/champions/metadata/${championNFT.tokenId}`);
  updateChampionDisplay(newMetadata);
}

function renderEvolveButton(champion) {
  const canEvolve = champion.level < 20;
  const hasGas = userBalance >= estimatedGasCost;
  
  if (!canEvolve) {
    return <button disabled>Max Level Reached</button>;
  }
  
  if (!hasGas) {
    return (
      <button disabled>
        Need {estimatedGas} PYR for gas
      </button>
    );
  }
  
  return (
    <button onClick={() => handleEvolveClick(champion)}>
      Evolve to {STAGES[champion.level + 1]}
    </button>
  );
}
```

### Image Display
```javascript
function ChampionCard({ tokenId }) {
  const [metadata, setMetadata] = useState(null);
  
  useEffect(() => {
    // Fetch dynamic metadata based on current on-chain level
    fetch(`/api/champions/metadata/${tokenId}`)
      .then(r => r.json())
      .then(setMetadata);
  }, [tokenId]); // Re-fetch when NFT evolves
  
  return (
    <div>
      <img src={metadata.image} alt={metadata.name} />
      <h3>{metadata.name}</h3>
      <p>Stage: {metadata.stage}</p>
      <p>Level: {metadata.level}/20</p>
    </div>
  );
}
```

---

## Stage Names & Level Map
```
Level  Stage
1      Whelp
2      Hatchling
3      Pup
4      Cub
5      Youngling
6      Apprentice
7      Initiate
8      Novice
9      Warrior
10     Veteran
11     Champion
12     Elite
13     Hero
14     Commander
15     Warlord
16     Exemplar
17     Paragon
18     Ascendant
19     Mythic
20     Legendary
```

---

## Gas & Payment Model

### Evolution Cost Structure
- **Gas for level increment:** ~100k-150k gas units (estimate pending actual contract)
- **Current network gas price:** Variable (user pays at time of tx)
- **Frontend responsibility:** Always estimate and validate before allowing evolution

### User Flow
1. User views their Level 5 Champion
2. System checks: "Evolution to Level 6 requires ~0.05 PYR in gas"
3. User has 0.10 PYR balance → Evolve button **enabled**
4. User clicks Evolve → Submits tx
5. On confirmation → Level increments to 6, image updates to `s06.png`

### Prevention of Failed Evolutions
```javascript
// ALWAYS check before enabling button
const canEvolve = (userBalance >= estimatedGas) && (level < 20);

// Never let user click if gas is insufficient
button.disabled = !canEvolve;
```

---

## Image Assets
All 5,500 images pre-exist in the repo:
```
/evolution20/
  /orc/
    /ironfang/
      s01.png (Whelp)
      s02.png (Hatchling)
      ...
      s20.png (Legendary)
    /ashclan/
      s01.png - s20.png
    ...
  /elf/
    /moonsong/
      s01.png - s20.png
    ...
  ... (all 22 bloodlines, 20 stages each)
```

Total: **22 bloodlines × 20 stages = 440 unique images** (pre-generated)

---

## Deployment Checklist

- [ ] Deploy Champion NFT contract with evolution function
- [ ] Set up `/api/champions/metadata/{tokenId}` dynamic endpoint
- [ ] Mint all 5,500 NFTs with `level=1`
- [ ] Allocate 2,750 to shop, 2,750 to chests
- [ ] Test gas estimation on testnet
- [ ] Add evolution button with gas validation to frontend
- [ ] Verify image files served correctly
- [ ] Test full evolution flow: Level 1 → Level 2 (image changes)

---

## Key Takeaway
**The NFT never changes — only the level number on-chain increments. That level maps to the correct image file via the dynamic metadata endpoint. Gas is required for the level update transaction, so the frontend must validate sufficient balance before allowing evolution.**
