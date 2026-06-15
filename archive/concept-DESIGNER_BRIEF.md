# PYRE — Designer Brief for pixelwish

---

## What is PYRE?

PYRE is a crypto token that **shrinks over time** — your balance slowly burns away every hour unless you protect it. To stop the burn, you "stake" (lock up) your tokens. To earn money from the project, you either stake or permanently burn your tokens to get an NFT.

Think of it like a bonfire. Your coins are the wood. The fire eats them unless you protect them. The deeper you commit to the fire, the more rewards you earn.

---

## The Three Things Users Do

1. **Stake** — Lock your tokens to protect them from decay and earn ETH rewards
2. **Burn** — Permanently destroy tokens to get a **Fire Spirit NFT** (earns ETH forever)
3. **Buy/Sell** — Trade PYRE on Uniswap (5% fee — sell-side fees burned, buy-side fees go to reward pool)

---

## Fire Spirit NFTs — The Main Character Art

When you burn enough tokens, you get a **Fire Spirit NFT**. It evolves through 4 stages based on how much you've burned total. The same NFT upgrades its art automatically as you burn more — no new token, the art just changes.

| Stage | Tokens Burned | Visual Feel |
|-------|--------------|-------------|
| **EMBER** | 10,000 | Small, faint flame — the ritual has begun |
| **FLAME** | 75,000 | Bright, active fire — alive and dancing |
| **FORGE** | 150,000 | Intense, focused heat — forged in fire |
| **PYRE** | 300,000 | Full inferno — a god-tier fire entity |

Higher stages are rarer and earn more ETH (up to 3× more than the base stage).

**LP variant:** Users who burn liquidity pool positions (a deeper commitment) get a special gradient overlay version of their Fire Spirit — visually distinct from the standard.

---

## The Immolated — A Special Group

Users who reach **Stage 4 (PYRE)** — the highest stage, requiring 300,000 cumulative burn weight — can go one step further by burning an additional **10,000 $PYRE** (or LP-equivalent). This final act makes them **the Immolated** — a permanent class of holders with a perpetual yield position and a unique mark on their Fire Spirit NFT.

The number is intentional: 10,000 is the same as the EMBER threshold. The first burn and the final seal are the same amount. Available to both token burn and LP burn paths.

Think of them as the inner order. Their Fire Spirit gets a visible alchemical sigil overlay to show their status — permanent, on-chain, for all to see.

---

## Brand & Visual Style

- **Vibe:** Luxury alchemy / editorial dark. An old alchemist's journal meets a fine whiskey brand.
- **Background:** Near-black `#080504`
- **Gold accent:** `#C9A96E`
- **Text:** Off-white `#EDE8E0`
- **Secondary text:** `#B8A88A`
- **Fonts:** Cormorant Garamond (titles), DM Sans (body text), Fira Code (code/numbers)
- **UI style:** Hairline gold borders, minimal ghost buttons, wide letter-spacing on display type

---

## The Frontend — Two Layers

### Layer 1: Dashboard
A standard webpage where users manage their tokens. Panels include:
- Their Fire Spirit NFT (big, front and center with current stage)
- Staking controls (lock/unlock tokens, claim rewards)
- Burn interface (burn tokens → evolve NFT)
- Global stats (total burned, decay rate, live rewards)
- Activity feed (recent burns and stakes)
- The Immolated panel (special section for the deep burners)

### Layer 2: Village World (the big unique thing)
Instead of a boring dashboard, the **main UI is a top-down game world** — a warm medieval village. No walking, no multiplayer. It's fully **click-based**:

- You see the village from above (top-down view)
- Click a building → cinematic animation plays (zoom in, door opens, fire flickers)
- A polished loading spinner / transition takes you into that building's UI panel
- Each building is its own full screen

**Visual vibe:** Warm, cozy, amber candlelight. Cobblestone streets. Lanterns, ivy, medieval fantasy. Think Hobbiton at dusk.

---

## The Buildings & Their Interiors

---

### The Observatory
*The pulse of the entire protocol. No user actions here — pure information.*

- **Rebase Countdown** — live clock ticking down to the next hourly decay tick
- **Current Decay Rate** — e.g. "0.45% / hour · Era 0"
- **Era Countdown** — how many epochs until the next halving (decay rate drops by half)
- **Total Supply Remaining** — how many $PYRE still exist right now
- **Total Burned All-Time** — cumulative $PYRE destroyed forever
- **Staking Ratio** — % of total supply currently staked (protected from fire)
- **Active Fire Spirits** — total number of NFTs in existence
- **S(t) Scaling Factor** — the global number that controls how many tokens each swap mints (starts at 1.0, slowly falls — early buyers get more)
- **Total ETH Distributed** — all-time ETH paid out to stakers and the Immolated
- **24h Swap Volume** — trading activity in the last day
- **Live Burn Rate Chart** — a visual graph of burns over time

---

### The Grand Exchange
*Where users buy and sell $PYRE. Simple, clean swap interface.*

- Token swap panel — ETH → $PYRE and $PYRE → ETH
- Input amount + estimated output
- Current $PYRE price in ETH
- Fee reminder — "5% fee applies. Sell-side fees are burned permanently."
- Price impact indicator
- Slippage tolerance setting
- Approve + Swap button
- Recent swap history (last few transactions globally)

---

### The Forge
*The action room. Two tabs: Stake and Burn.*

**Stake tab:**
- Your current liquid balance + live decay countdown ("losing 0.45%/hr")
- Amount input to stake
- Approve + Stake buttons
- Your staked balance (safe from fire)
- Pending ETH rewards + Claim button
- Drip status — if currently unstaking, shows a progress bar and how much is returning over 7 days (with ongoing decay loss shown)
- Burn effect plays on burn action, stake effect plays on stake action

**Burn tab:**
- Your liquid balance
- Cumulative $PYRE burned so far (across all transactions)
- Progress bar to next Fire Spirit stage
- Amount input to burn
- Burn button (triggers fire particle effect)
- LP burn option — deposit ETH + $PYRE into the pool and burn the LP shares permanently (+20% weight bonus, gradient Fire Spirit variant)

---

### Hall of the Immolated
*The inner sanctum. Only accessible once your Fire Spirit reaches Stage 4 (PYRE) and you have burned an additional 10,000 $PYRE to claim Immolated status. Locked screen with a hint of what's inside for everyone else.*

- Your Immolated burn weight (your share of the pool)
- Your pending ETH yield from the Immolated pool
- Claim button
- Burn more — input to add more tokens or LP to your weight
- Your rank among all Immolated
- Leaderboard — top Immolated wallets ranked by weight, showing their Fire Spirit stage and burn weight
- Total Immolated pool size — how much total weight exists

*For non-Immolated users:* locked screen with a sigil and a message like "The Immolated do not announce themselves. Reach the Pyre."

---

### The Amber Vault
*Your personal record. Everything about your position in one place.*

- Your Fire Spirit NFT — large display, showing current stage art
- Stage name + number (e.g. "FLAME — Stage II")
- Cumulative $PYRE burned (your total, all-time)
- Progress ring / bar to next stage with tokens remaining
- Liquid balance + live decay timer (how much you're losing per hour)
- Staked balance
- Pending ETH rewards
- Drip status if applicable
- Badge showing LP Immolated or standard Immolated if applicable
- Personal transaction history — your burns, stakes, claims

*If no Fire Spirit yet:* shows an empty pedestal with a flame silhouette and how many tokens remain until first mint (10,000 cumulative)

---

### The Tavern
*The community room. No financial actions — just information and social proof.*

- Announcement board — pinned posts from the team (new eras, events, updates)
- Live burn feed — a scrolling list of recent burns happening across all wallets ("0x4f…2a burned 12,400 $PYRE · FLAME unlocked")
- Recent stakes feed
- Top Burners leaderboard — highest cumulative burns all-time
- Era milestone tracker — next halving countdown with a brief explanation of what changes
- KOL activity highlights (when notable wallets burn or stake)

---

### The Bonfire Square
*The heart of the village. Not a building — an open plaza. The centrepiece is a living bonfire.*

- The bonfire itself dominates the screen — it has multiple visual states based on total all-time burns:
  - **Kindling** (launch) — a small, cautious flame
  - **Burning** — a proper fire, growing
  - **Raging** — large, dramatic, embers flying
  - **Inferno** — the full vision, fills the frame
- Live global burn counter displayed beneath or beside the flame
- A real-time ticker of burns happening right now
- Optional: a quick-burn shortcut — throw tokens directly into the bonfire from this screen

---

### The Black Market *(coming soon)*
*Visually closed. Boarded up doors, dark shuttered windows, a faint amber glow seeping through the cracks — hinting something lives inside. No interaction. Will become the Fire Spirit NFT trading marketplace when built.*

---

## Visual Effects

### Burn Effect
When a user burns tokens, fire particles emit from the action — flames rising, embers scattering. The fire is consuming something. Aggressive, irreversible energy.

### Stake Effect
Staking is the opposite — **protection from the fire**. The visual should feel like the tokens are being sealed away, made untouchable. Direction: tokens encased in glowing amber/gold crystal or a gold lattice shell that forms around them. The fire rages outside but cannot reach what's inside. Warm, solid, preserved. Think molten gold hardening into a protective shell — immune to the burn around it.

The two effects should feel like opposites of each other:
- **Burn** = release, destruction, upward energy
- **Stake** = containment, preservation, something locked and safe

### Fire Spirit Evolution Animation
When a user's cumulative burns cross a stage threshold, their Fire Spirit upgrades. This is the most emotionally significant moment in the product — it should feel earned and dramatic.

Direction: the current Fire Spirit art is consumed by fire — a burst of flames overwhelms the frame. As the fire settles, the new stage emerges from the ash, more powerful than before. Not a crossfade. A transformation. Should have a matching sound effect. The whole sequence should take 2–3 seconds and feel like a reveal.

### The Drip Exit Visual
When a user unstakes, their tokens don't return immediately — they slowly drip back over 7 days while continuing to decay. The design needs to communicate that something is slowly being lost.

Direction: a cracked amber crystal slowly draining — liquid gold leaking from it, with fire visibly consuming a portion as it falls. The Forge shows a progress bar for the drip (how much has returned vs. still locked) alongside a live counter of how much has decayed since the drip began. The feeling should be: "this is expensive — I should have stayed."

### Toast / Notification System
Every on-chain action needs visual feedback. All toasts follow the brand — dark background, gold border, fire iconography.

- **Burn confirmed** — a small flame rises from the bottom of the screen with the amount burned
- **Stake confirmed** — a golden seal forms with a soft glow
- **Rewards claimed** — an ETH drop animation, amber coins falling
- **Stage upgraded** — triggers the full evolution animation (see above)
- **Drip started** — a cracking sound, the crystal begins draining
- **Error / failed** — a dying ember, smoke, muted red text

### Era Halving Event
Every ~83 days the decay rate halves — this is a major community milestone and a natural marketing moment. The village should react.

Direction: a bell tolls across the village (audio), the Bonfire Square gets a brief celebration effect (embers burst into the sky), and a scroll unfurls across the screen announcing the new era and new decay rate. The Observatory and Tavern both show a countdown to the next halving at all times. This is a recurring event — design it to feel like a festival.

---

## NFT Art Direction

### Fire Spirit — Generative Trait System

This is a generative NFT collection. Each Fire Spirit has a **seed** — a unique number locked at the moment it first mints (EMBER stage). That seed determines everything: coloration, and all traits revealed at later stages. The final PYRE form is already "destined" at mint — the holder just can't see it yet. Every stage is a reveal.

**EMBER — Hardcoded structure, generative coloration**
No generative traits. The silhouette and body shape are the same for every EMBER — a barely-visible entity inside a flame. What varies is the **fire coloration**, pulled from the seed. Design a palette of distinct colorations — for example:
- Warm amber-orange
- Deep blood crimson
- Cold blue-white
- Pale gold
- Ashen violet-grey

Every EMBER holder has a unique color identity from day one, but no traits yet. Minimal, mysterious.

**FLAME — 1 trait unlocks**
The entity starts to take form. One generative trait is revealed from the seed — something that begins to define its identity. Example trait categories (designer to develop the full set): aura style, eye type, particle effect, secondary flame element.

**FORGE — 2 traits total**
The FLAME trait remains. A second trait unlocks from the same seed. The entity is more defined, more complex.

**PYRE — 3 traits total**
All prior traits remain. The final trait unlocks — the complete realized form. Fully revealed, fully transformed. The rarest visual state in the collection.

**Layers on top of all stages:**
- LP gradient overlay — present at every stage for LP burners
- Immolated glyph — appears when Immolated status is reached, on any stage

### LP Variant — Gradient Overlay (all 4 stages)
Users who burned liquidity positions progress through the same 4 stages as token burners — this is one unified collection. The only visual difference is the gradient overlay, which is present at every stage of the LP path.

Direction: a deep amber-to-gold liquid gradient wraps around the standard fire art at each stage — like the flames are submerged in molten gold. Richer, heavier, more premium than the standard. Should read as "this person went further." The underlying stage art (EMBER / FLAME / FORGE / PYRE) is the same — the gradient is layered on top.

**Total visual states to design: 8** — 4 stages × 2 paths (standard + gradient).

### The Immolated Glyph
When a Fire Spirit holder becomes Immolated, a permanent mark appears on their NFT. Direction: a circular sigil — like an ancient wax seal burned into the art. Based on alchemical iconography (the upward triangle, the symbol for fire and transformation). Deep gold or ash-white. Positioned in a corner or at the base of the art — an embellishment, not covering the main image. Should feel like a brand mark from a secret order.

---

## States & Empty Screens

### Pre-Wallet-Connect (Village)
The village is visible but dormant — fires dim, buildings dark, a light mist over everything. A single lit lantern at the entrance of the village acts as the "Connect Wallet" prompt. Once connected, the village wakes up: fires ignite, warmth floods in, buildings become interactive. The transition should feel like dawn breaking.

### No Fire Spirit Yet (Amber Vault)
An empty stone pedestal where the NFT would sit. A faint flame silhouette hovers above it — ghost of what could be. Below it: "X,XXX $PYRE until your Fire Spirit wakes." A subtle pulse on the silhouette.

### No Staked Tokens (The Forge — Stake tab)
A cold, unlit forge. No fire in the hearth. A prompt: "Nothing staked. The fire is taking everything." Conveys the cost of inaction.

### Drip In Progress (The Forge)
The crystal draining visual (described above) takes over the staking panel. The standard stake/unstake controls are replaced by the drip tracker until the full drip is claimed. Cannot restake until it completes.

---

## Platform Scope

- **Village World** — desktop only. Not designed for mobile.
- **Dashboard (Layer 1)** — must be fully mobile-responsive. Design mobile layouts for all panels.

---

## What Needs Designing

1. **Fire Spirit NFT art** — Generative collection. Deliverables: base silhouette, fire coloration palette (5+ distinct colorations for EMBER), trait categories and trait art for FLAME/FORGE/PYRE (3 traits unlocking progressively), LP gradient overlay layer, Immolated glyph layer. The seed system and reveal logic are handled in code — the designer provides the raw art components that the generator assembles.
2. **Village map** — Top-down medieval village with all 8 buildings. Warm amber/fire lighting.
3. **Building entry animations** — When you click a building, it animates (zoom, door opens, etc.) + a medieval-style voice line plays, welcoming the user and giving a one-sentence explanation of what the building does. Each building has its own unique line. The voice should feel like a town crier or old world innkeeper — warm, authoritative, immersive. Example: clicking The Forge might say *"Welcome to The Forge — stake your tokens here, and the fire cannot touch them."* The animation and voice play together as one entry moment.
4. **Loading spinners / transitions** — Premium, fire-themed, polished.
5. **Building interior UI panels** — What you see once inside each building.
6. **Dashboard UI** — Standard web page layout following the brand style.
7. **Logo / wordmark** — PYRE brand mark.

---

## Open Design Questions (for the meeting)

- Art style: **pixel art** vs **illustrated 2D**?
- Seasonal village events (bonfire night, era halvings, etc.)?
