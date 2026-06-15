# Fire Spirit NFTs

The Fire Spirit is PYRE's NFT — minted by **burning** tokens (not sold directly at mint). It **evolves in place**: the *same* token transforms as the holder's cumulative burn crosses each threshold — no new token per stage, the art just changes. The contract picks which artwork to show from the wallet's live burn total, so upgrades are automatic and instant.

## The four stages (locked)

| Stage | Cumulative burn | Yield multiplier | Visual idea |
|-------|----------------|------------------|-------------|
| EMBER | 10,000 PYRE | 1× | A faint, newly-kindled spirit |
| FLAME | 75,000 PYRE | 1.5× | Form emerges, fire takes shape |
| FORGE | 150,000 PYRE | 2× | Solid, radiant, commanding |
| PYRE | 300,000 PYRE | 3× | The final form — full glory |

## Art approach — ⚠️ NOT YET LOCKED (under review, 2026-06-15)

> **The rendering approach is being re-decided.** Two options are on the table:
> *static images per stage* (described below) vs *on-chain generative SVG* (unique
> per token). **Do concept/exploration work, but hold final production until this
> is locked** — the two paths imply different deliverables and different format
> constraints. You'll be told the moment it's decided. The *stages, thresholds, and
> "same evolving entity" intent* are stable either way.

**Leading direction — static images per stage:** one fixed artwork per stage —
every EMBER looks the same as every other EMBER, and so on. Tiers must read
instantly and look dramatically different from each other; within a tier,
identical. Rationale: Fire Spirits are held for their yield, and identical art per
tier keeps market value tied to that yield.

**If this path is chosen, no technical format constraints** — full creative
freedom, painterly/illustrated/rendered, any medium that produces a stunning final
image. The four stages must clearly be the *same evolving entity* gaining power,
not four unrelated characters. (The alternative on-chain-SVG path *would* impose
vector/layer constraints — another reason to hold final production until locked.)

## The full image set (~10 pieces)

| # | Image |
|---|-------|
| 1–4 | EMBER, FLAME, FORGE, PYRE — base versions |
| 5–8 | The same four with the **LP-burner gradient** treatment (a distinct color/aura variant for wallets that burned liquidity positions) |
| 9 | PYRE + **Immolated glyph** (a mark of the inner circle, layered onto the final stage) |
| 10 | PYRE + LP gradient + Immolated glyph |

The LP gradient and Immolated glyph should feel like honors layered onto the base art — same spirit, marked by deeper sacrifice.

## Status vs. the concept delivery (2026-06-12)

The first concept pass delivered character art, but it does **not** yet match this spec. Outstanding against the 10-piece set above:

- ❌ **The 4-rung ladder isn't locked.** The concept shows ~3 looks, not 4 clearly distinct, dramatically escalating stages. We need a defined EMBER → FLAME → FORGE → PYRE progression where each tier reads instantly.
- ❌ **No LP variant.** None of the 4 gradient versions (#5–8) exist yet.
- ❌ **No Immolated glyph.** The inner-circle mark (#9–10) hasn't been designed.

**One decision blocks everything — please resolve first:**

- ⚠️ **Fire entity vs. robed figure.** This spec describes an evolving *fire spirit* (a flame-being gaining power). The delivered concept shows **hooded human acolytes**. Both are valid — the acolyte look fits "the Immolated / inner order" — but we must pick one and align this page *and* the concept art to it. Everything else (LP variant, glyph, the 4 stages) hangs off this call.
- ⚠️ **Trait grid is on hold, not dropped.** The delivered "NFT Traits" sheet (skin tones × cloak colors) is a **generative** approach. Static-per-tier was the leading direction, but the static-vs-generative decision is now reopened (see "Art approach" above) — so don't invest in a combinatorial trait system yet, but keep the trait exploration; it becomes relevant if the generative path is chosen.

**Open contract/dev question (not a design task — flagged for the build):** the art is derived from the *holder's* live cumulative burn. That needs reconciling with the Black Market — if a Fire Spirit is bought, does it keep the seller's stage or recompute to the buyer's burn? And can a wallet hold more than one? Unresolved as of 2026-06-12.

## Delivery

- Square format (PFP-friendly), high-resolution master (2048×2048+) plus web-optimized versions
- Concept pass on the 4 base stages first — we lock the character and progression, then produce the variants
