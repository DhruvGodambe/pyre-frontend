# UI Screens

Every feature is a **panel**. The panels are the same everywhere — what changes is the container.

**Two shells, one set of panels:**

- **Mobile → the Dashboard.** One scrolling page, panels stacked in priority order. This is what most users get, because most users arrive on a phone via X. **Design mobile first.** Overlapping/broken phone layouts have burned us before.
- **Desktop → the Village.** Each panel lives inside its building. Click a building → entry animation → that panel opens full-screen.

So "The Forge" (a building in the Village) and "the staking panel" (a zone on the mobile Dashboard) are **the same screen in two frames.** Design the panel once; we place it in both. Every panel ships mobile + desktop.

---

## The panels, by building

Each heading is a Village building **and** a Dashboard zone. The name in parentheses is the nameplate name shown in the world.

### The Observatory — live protocol stats
*Read-only. No wallet required — public data. The pulse of the whole protocol.*

- Rebase countdown — live clock to the next hourly decay tick
- Current decay rate + era (e.g. "0.45% / hr · Era 0")
- Era countdown — epochs until the next halving
- Total supply remaining
- Total burned all-time
- Staking ratio (% of supply protected)
- Active Pyre Acolytes (total NFTs in existence)
- S(t) scaling factor (starts 1.0, falls over time)
- Total ETH distributed all-time
- 24h swap volume
- Live burn-rate chart

### The Amber Vault — your position
*Personal. Requires wallet. Everything about you in one place.*

- Your Pyre Acolyte NFT — large, current stage art
- Stage name + number (e.g. "FLAME — Stage II")
- Cumulative $PYRE burned (your all-time total)
- Progress ring to next stage + tokens remaining
- Liquid balance + live decay timer
- Staked balance · pending ETH rewards
- Drip status (if unstaking)
- Immolated badge — standard or LP variant, if applicable
- Personal transaction history (your burns, stakes, claims)
- **Empty state:** stone pedestal + flame silhouette — "X,XXX $PYRE until your Pyre Acolyte wakes."

### The Forge — stake & burn
*The action room. Two tabs.*

**Stake tab**
- Liquid balance + live decay countdown ("losing 0.45%/hr")
- Amount input · approve + stake
- Staked balance (safe from fire) · pending ETH + claim
- Drip status — 7-day return progress bar with ongoing decay loss shown
- Stake effect on action (gold seal); burn effect on burn

**Burn tab**
- Liquid balance · cumulative burned so far
- Progress bar to next Pyre Acolyte stage
- Amount input · burn button (fire particle effect)
- LP burn option — deposit ETH + $PYRE, burn the LP shares (+20% weight, gradient Pyre Acolyte variant)

**States:** "cold unlit forge" when nothing staked; the drip-draining visual takes over the panel while a drip is in progress (can't restake until it completes).

### Hall of the Immolated — the inner order
*Gated. Only opens at Stage 4 (PYRE) + an additional 10,000 $PYRE burned.*

- Your Immolated burn weight (your share of the pool)
- Pending ETH yield · claim
- Burn more — add tokens or LP to your weight
- Your rank among all Immolated
- Leaderboard — top Immolated wallets by weight, with stage + weight
- Total Immolated pool size
- **Outsider state:** locked screen, alchemical sigil — "The Immolated do not announce themselves. Reach the Pyre."

### The Grand Exchange — buy & sell $PYRE
*Simple, clean swap.*

- PYRE/ETH swap — amount in/out, estimated output
- Live $PYRE price
- **Fee display** — 5% fee, presented honestly: sell-side burned permanently, buy-side to the reward pool
- Price impact indicator · slippage setting
- Approve + Swap
- Recent swap history
- **States:** transaction pending / confirmed / failed

### The Ashen Cup (Tavern) — community & quests
*No financial actions. Information, social proof — and the pre-launch funnel lives here.*

- Announcement board — pinned team posts (eras, events, updates)
- Live burn feed — scrolling recent burns ("0x4f…2a burned 12,400 $PYRE · FLAME unlocked")
- Recent stakes feed
- Top Burners leaderboard (cumulative, all-time)
- Era milestone tracker — next halving countdown + what changes
- KOL activity highlights

**Pre-launch quest variant (the funnel — folded in here):**
- Task checklist — 7 tasks, some time-unlocked (follow X, share manifesto, quiz, refer, etc.)
- Wallet-submission field — plain text input, no wallet connection, closes L−1
- Completion / share screen — "Claim your multiplier" button: copies a branded image to clipboard + opens a pre-filled tweet

### The Bonfire — live burn counter
*The central plaza, not a building. The heart of the village.*

- The bonfire dominates the screen, with 4 visual states tied to total all-time burns: **Kindling → Burning → Raging → Inferno**
- Live global burn counter beneath the flame
- Real-time ticker of burns happening now
- Optional: quick-burn shortcut — throw tokens straight into the fire

### The Black Market — Pyre Acolyte marketplace *(live at launch)*
*Open from day one. Pyre Acolytes are standard ERC-721, so listings come from existing marketplaces (OpenSea/Blur) wrapped in PYRE's own branded UI — no separate marketplace contract.*

- Browse Pyre Acolytes — filter by stage, LP variant, Immolated
- Each listing card: stage + yield multiplier, price, burn-progress toward next stage
- Buy flow (settles via the underlying marketplace) + link out to the full listing
- **Empty-market state (launch):** at launch no Pyre Acolytes exist yet — none are minted until wallets burn. Design an intentional "the market is cold, no spirits have risen yet" state that fills as mints happen. This is the screen most users see first, so make the emptiness feel like anticipation, not breakage.

### The Gate — enter / connect wallet
*The entry moment, not a feature panel.*

- Pre-connect: the village is dormant — fires dim, buildings dark, light mist. A single lit lantern at the Gate is the "Connect Wallet" prompt.
- On connect: the village wakes — fires ignite, warmth floods in, buildings become interactive. The transition should feel like dawn breaking.

---

## Mobile Dashboard — stacking order

On mobile, the panels above become one scrolling page, in this priority order:

1. **The Bonfire counter** — a slim live burn header at the top
2. **The Amber Vault** — your Pyre Acolyte + position (the thing people open the app to see)
3. **The Forge** — stake / burn controls
4. **The Observatory** — global stats
5. **Hall of the Immolated** — full panel for members, teaser for everyone else
6. **The Ashen Cup** — activity feed + announcements
7. **The Grand Exchange** — swap (also reachable as its own route)

---

## States to design for every screen

- Wallet not connected / connected
- Loading & transaction-pending — **make waiting feel ritual, not broken**
- Error / rejected transaction
- Empty states (no Pyre Acolyte yet, nothing staked, no drip)

---

## What we need from you

**Mobile first, desktop second**, in this order:

1. **Wallet-connect moment** (the Gate / village waking)
2. **The Amber Vault** (your position + Pyre Acolyte)
3. **The Forge** (stake + burn flow)
4. **The Observatory** (stats)
5. **Hall of the Immolated** (member + locked states)
6. **The Grand Exchange** (swap)
7. **The Ashen Cup** (community + the pre-launch quest funnel)
8. **The Black Market** (marketplace browse + buy + the empty-market launch state)

The **Black Market is now live at launch** (branded window over external listings) — include it in the launch set, not after. The **Bonfire** is a counter + flame states, not a full UI.
