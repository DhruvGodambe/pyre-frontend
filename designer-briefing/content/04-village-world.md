# The Village World

PYRE's main interface is not a dashboard — it's a **warm, cozy top-down medieval village**. Users click buildings to access features; each click plays a cinematic entry animation before the feature panel opens. Think *Hobbiton meets amber candlelit cobblestone streets*.

## Interaction model (locked)

- **No walking character, no multiplayer.** Purely click-based.
- Click a building → entry animation (zoom toward the door, door opens, warm light spills out) → feature panel slides/fades in.
- Top-down perspective (not isometric — faster to build, still beautiful).
- Polished transitions and loading moments everywhere — this is where the magic lives.

## Visual direction

Warm amber/orange lighting. Candles, lanterns, ivy, cobblestone, chimney smoke. Dusk or night — the village glows from within. The brand's gold-on-dark carries into the world naturally.

**Art style is the open decision: pixel art vs illustrated 2D.** This is the first thing we need your recommendation on — it gates everything else in this section.

## The buildings

| Building | Function |
|----------|----------|
| The Gate | Entry point — wallet connect; the village wakes once connected |
| The Bonfire | Central plaza — live burn counter, the flame grows as more PYRE burns |
| The Observatory | Live protocol stats — price, burns, staking, holders |
| The Grand Exchange | Token swap (PYRE/ETH) |
| The Forge | Staking & burning — fire particle effects |
| Hall of the Immolated | Inner-circle panel + leaderboard |
| The Amber Vault | Personal wallet view — holdings, Fire Spirit, tier |
| The Ashen Cup (Tavern) | Community board — announcements, burn feed + pre-launch quest funnel |
| The Black Market | **Live at launch** — Fire Spirit marketplace (browse + buy; listings sourced from OpenSea/Blur, wrapped in PYRE's UI) |

The full UI panel behind each building is specified in **UI Screens**.

## Navigation — nameplates, not hover

The world is shown **zoomed in enough that every building's nameplate is readable on one screen** — no panning, no scrolling, no clicking to discover what's what. The painterly wide shot can play once on entry, then settle into this labeled playable view.

**Every building wears a nameplate** — an engraved plaque / hanging sign, part of the art (brand gold-on-dark, Cormorant Garamond). Each plaque shows a **name + a small function tagline**, so a cold visitor knows what a building does without entering:

| Nameplate name | Tagline |
|----------------|---------|
| The Observatory | Live protocol stats |
| The Grand Exchange | Buy & sell $PYRE |
| The Forge | Stake & burn |
| Hall of the Immolated | The inner order |
| The Amber Vault | Your position & Fire Spirit |
| The Ashen Cup | Community & news |
| The Bonfire | Live burn counter |
| The Black Market | Buy & sell Fire Spirits |
| The Gate | Connect wallet |

The system is deliberately simple: **read the plaque → click to enter.** Names give personality, taglines give clarity. (No attention-pulsing, no live-stat badges floating on the map — the world stays a calm painting until you reach for it.)

## What we need from you

1. **Art style decision support** — one sample frame of the village in pixel art and/or illustrated 2D, so we can lock direction.
2. **The village map** — full scene with all 9 buildings composed (incl. the Gate), nameplates legible at the default zoom, day-night-capable lighting.
3. **Building close-ups / entry frames** for the click-to-enter animations.
4. **Pre-launch quest variant**: before launch the village doubles as our quest funnel — task markers, a completion state, and a wallet-submission moment all live inside it.
