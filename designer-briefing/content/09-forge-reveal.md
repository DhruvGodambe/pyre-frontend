# The Forge Reveal (cinematic)

When a wallet **burns** enough $PYRE to cross a tier, the app should celebrate it with a short, full-screen cinematic, the single most satisfying beat in the whole loop. Right now the app has a working **scaffold** (it triggers at the right moment and lays out the beats with placeholder visuals). **We need you to design the real cinematic and deliver the sounds.** The app will drop them straight in.

> Reminder on the mechanic: tiers come from **burning**, never staking. Staking earns ETH and makes the multiplier pay off, but the Acolyte tier (and these cinematics) are driven by cumulative burn.

## There are TWO cinematics

### 1. Tier upgrade (per tier)
Fires when a burn crosses a threshold, mints the first Acolyte, or reaches Immolated.

| Trigger | Title shown | Multiplier |
|---|---|---|
| First burn to 10,000 | EMBER ACOLYTE | 1× |
| Cross 75,000 | FLAME ACOLYTE | 1× → 1.5× |
| Cross 150,000 | FORGE ACOLYTE | 1.5× → 2× |
| Cross 300,000 | PYRE ACOLYTE | 2× → 3× |
| PYRE + 10,000 more | IMMOLATED ACOLYTE | 3× (joins the Hall) |

Each tier should feel **bigger than the last** , Ember is a spark catching; Pyre is full glory; Immolated is the final, sacred gate.

### 2. LP burn (the bigger sacrifice)
Fires when a wallet does a **Burn LP** (pairs $PYRE + ETH, locks it in the pool **forever**, for +20% burn weight). This is a heavier, more permanent act than a normal burn, so it gets its **own, weightier cinematic** (think binding, chains, a deeper fire, no going back), distinct from the tier reveal. An LP burn can also cross a tier; for now the LP cinematic takes precedence.

## Beats (target ~6-7 seconds, skippable)
1. Screen darkens to the forge.
2. A flare/burst ignites from the center.
3. The **Acolyte rises out of the fire** (uses the tier's Acolyte art).
4. The **tier name stamps in** + the multiplier (e.g. `1× → 1.5×`).
5. A line from the **Emberkeeper**, then settle to a **Continue**.

You own the full art direction of these beats, the scaffold's sparks/flare/timing are just placeholders to show structure.

## What to deliver

**Sounds** (one short sting each, ~1-3s, mixes over the world music). File names the app already listens for:
```
/world/audio/sfx/forge-tier-1.mp3          (Ember)
/world/audio/sfx/forge-tier-2.mp3          (Flame)
/world/audio/sfx/forge-tier-3.mp3          (Forge)
/world/audio/sfx/forge-tier-4.mp3          (Pyre)
/world/audio/sfx/forge-tier-immolated.mp3  (Immolated)
/world/audio/sfx/forge-lp-burn.mp3         (LP burn)
```

**Visuals** , however you want to build the cinematic, one of:
- a short **video per tier** (transparent or full-frame, 1080×1080 or 16:9), or
- a layered **animation** spec (sprite/particle sheets + timing) you hand off, or
- a **Lottie/JSON** animation.
Tell us the format and we will wire it; until then the placeholder beats play (silently, no sound) so nothing breaks.

**Per-tier Acolyte art** also feeds this (the figure that rises). That's the same art tracked in *Pyre Acolyte NFTs*, still pending. A single shared Acolyte placeholder is in use for now.

## Status
- App scaffold: **done** (triggers on tier-up + LP burn; full-screen; Continue/auto-dismiss). Tunable in `components/ui/forge-reveal.tsx`.
- Waiting on you: the six sounds above + the cinematic visual direction (and per-tier Acolyte art).
