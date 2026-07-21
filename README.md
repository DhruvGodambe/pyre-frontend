# Pyre

Monorepo for Pyre Protocol's frontend and internal docs.

| Folder | What it is |
|---|---|
| `pyre-app/` | The product: Next.js village-world frontend (swap, stake, burn, tiers, quests) |
| `concept/` | Internal design + tokenomics docs |
| `marketing/` | Internal marketing material |
| `archive/` | Superseded material, ignore |

## Run the app against Robinhood Chain mainnet (production)

```bash
cd pyre-app
npm install
```

Create `pyre-app/.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Set at minimum:

```bash
DESIGNER_PASSWORD=dev
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your WalletConnect project id>
NEXT_PUBLIC_CHAIN_ID=4663
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_LAUNCHED=true
NEXT_PUBLIC_RPC_ROBINHOOD=https://rpc.mainnet.chain.robinhood.com
```

Contract addresses for chain `4663` are baked into `lib/config.ts` from the
Robinhood deploy (`pyre-protocol/broadcast/DeployAll.s.sol/4663`). Override
with `NEXT_PUBLIC_PYRE_*` env vars if you redeploy.

```bash
npm run dev
```

Open http://localhost:3000, log in at `/login`, connect a wallet on **Robinhood
Chain** (the app switches automatically). You need ETH on Robinhood Chain for
gas and swaps.

## Run the app against the Sepolia contracts (testnet)

```bash
cd pyre-app
npm install
```

Create `pyre-app/.env.local`:

```bash
# Any value you like; it is the local login password for the gated /kingdom.
DESIGNER_PASSWORD=dev

# RainbowKit / WalletConnect — required for the wallet connect modal.
# Create a free project at https://cloud.walletconnect.com and paste the Project ID.
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=

# Chain mode: real contract reads/writes instead of demo data.
NEXT_PUBLIC_USE_MOCK=false
# Launched mode: buildings unlock by real on-chain progression instead of the
# pre-launch sealed state.
NEXT_PUBLIC_LAUNCHED=true
NEXT_PUBLIC_CHAIN_ID=11155111
```

```bash
npm run dev
```

Open http://localhost:3000, click through the front door, log in at `/login`
with the password you set above. Connect an injected wallet (MetaMask/Rabby);
the app pins/switches it to the configured chain automatically. On Sepolia you
need Sepolia ETH; on Robinhood Chain you need ETH on chain 4663.

The funnel to test end to end: buy $PYRE at the **Grand Exchange** → the
**Forge** unlocks → stake and burn there (10,000 cumulative burn mints the
first NFT; thresholds 10k/75k/150k/300k) → claim rewards at the **Amber
Vault** → LP-burn and the **Hall of the Immolated** at the top end.

Without the env flags the app runs on realistic mock data (the default for
design work): `NEXT_PUBLIC_USE_MOCK` unset/true = demo, no chain needed.
Quests persist to a local JSON file unless Supabase env vars are set.

## Where the chain integration lives

Everything on-chain goes through one seam, `lib/datasource/` (the UI only sees
the `DataSource` interface; mock and chain are interchangeable):

- `lib/config.ts` — chain id, contract addresses (Sepolia + Robinhood fallbacks),
  Uniswap v4 deployment addresses, PoolKey parameters, the deploy block anchor
  for event scans.
- `lib/datasource/chain.ts` — every read and write: swap (custom
  IUniswapV4Router04, plain ERC-20 approval, no Permit2), quotes (V4Quoter via
  eth_call), stake/unstake/drip/burn (PyreToken + PyreStaking), Immolate rite
  (handles the ADDITIONAL_BURN allowance), LP burn (finds the caller's v4
  position NFT in our pool, approves the diamond, calls burnLpPosition).
- `lib/datasource/events.ts` — everything the contracts have no getter for
  (feeds, history, leaderboards, total burned/staked, Acolyte count, 24h
  volume) is derived from event logs, scanned incrementally from the deploy
  block. Uses its own archive-friendly RPC (Tenderly gateway by default;
  override with `NEXT_PUBLIC_RPC_LOGS`).
- `lib/datasource/abis.ts` — the minimal ABIs + PoolKey/poolId derivation.

## Notes for the contract side (found while wiring, deployed bytecode d02bed86)

- The deployed NFT is still `FireSpirit` (`SpiritMinted`/`SpiritUpgraded`
  events); the frontend listens to those names, not the `Acolyte` rename on
  `main`. Ping us when a redeploy changes event names.
- `BurnFacet.getTotalPyreBurned()` never increments in the deployed code; the
  frontend sums `Transfer(→0x0)` logs instead.
- The LP-burn `afterRemoveLiquidity` path deposits yield without incrementing
  `totalEthToYieldPool`; the frontend sums `RewardAdded` events instead.
- The fee schedule's parameters (initial/final bps, duration) have no getter;
  only `getCurrentBuyFeeBps`/`getCurrentSellFeeBps` are readable, so the UI
  derives the launch portion assuming the 500 bps resting fee.
- `ImmolatedGate.immolate()` pulls `ADDITIONAL_BURN` via `burnFrom`; the
  frontend approves the gate automatically before calling it.
