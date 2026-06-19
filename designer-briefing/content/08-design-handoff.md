# Design Hand-off & Asset Checklist

This is the bridge between your design and the working app. The frontend already
exists as a **clickable skeleton** — every screen, every state, fully built and
running on mock data, wearing rough placeholder paint. Your job is to give it its
face. This section tells you **exactly what to design and deliver**, screen by
screen, plus the style values that drop straight into the build.

> **The skeleton is your living reference — walk it before designing each piece.**
> It is the real, exact definition of every screen and state, more precise than
> any mockup, because it *is* the app:
>
> ### → [designer.pyreprotocol.com/app](https://designer.pyreprotocol.com/app)
>
> Password-protected — ask for the access password if you don't have it. It runs
> on mock data, so everything is clickable. On a wide screen it's the Village;
> narrow the window and it becomes the mobile Dashboard. The look is rough
> placeholder — judge the *structure and flow*, not the paint. That's what you're
> here to give it.

Nothing here overrides **05 · UI Screens** — that lists what each panel *contains*.
This section lists what you must *design and hand over*, and in what form.

---

## How your work reaches the app

Everything you deliver lands in one of two buckets. Keep them separate when you
hand off:

1. **The look** → a set of *style values* (colours, fonts, spacing, corners,
   glow, motion). These go into a single "token" file and reskin the entire app
   at once. See **Style foundation** below — fill in every value.
2. **The art** → image/SVG assets, one screen or element at a time. See the
   **Asset checklist** and **Per-screen deliverables**.

You never touch code. You deliver values + assets; they get integrated and the
skeleton becomes the real thing.

---

## Style foundation — fill in every value

These are the exact knobs the whole app reads from. Give a value for each (hex,
font name, or px). This is the single most leverage-heavy thing you deliver — it
styles every screen simultaneously.

**Colour — brand**
- [ ] Brand fire (primary gold/amber) — the core PYRE colour
- [ ] Brand deep (darker ember, for hovers / gradients)
- [ ] Brand soft (pale gold, highlights)

**Colour — surfaces (dark, layered)**
- [ ] Page background (near-black, warm)
- [ ] Panel / card surface
- [ ] Raised surface (inputs, raised elements)
- [ ] Border / divider / hover fill

**Colour — text**
- [ ] Primary text · [ ] Secondary text · [ ] Muted/caption text

**Colour — semantic**
- [ ] Success (staked / confirmed) · [ ] Danger (decay loss / rejected)
- [ ] Warning (pending / drip) · [ ] Info (neutral)

**Colour — Pyre Acolyte stages** (one each)
- [ ] EMBER · [ ] FLAME · [ ] FORGE · [ ] PYRE

**Type**
- [ ] Display font (headings, building names) — currently Cormorant Garamond
- [ ] Body font · [ ] Mono/number font (for stats & balances)
- [ ] Type scale notes (sizes/weights for h1–h4, body, caption)

**Shape & depth**
- [ ] Corner radius scale (small / medium / large / panel)
- [ ] Panel shadow · [ ] The "glow" (candlelit warmth around active elements)

**Motion**
- [ ] Standard transition duration & easing
- [ ] Building-entry animation duration & character (the zoom-to-door)

---

## Asset checklist — what to design & deliver

### The Village (desktop world)
- [ ] **Village map** — full top-down scene, all 9 buildings composed, day/night-
      capable lighting. Nameplates legible at default zoom. *(delivered: exteriors
      via Pyre_Concept.pdf — map composition still needed.)*
- [ ] **9 building exteriors** — already delivered ✓
- [ ] **9 door close-ups** — the framed "standing at the door" shot for each
      building (shown before you enter). One per building.
- [ ] **9 building interiors** — the room behind each door, framing its panel.
      *Delivered: The Ashen Cup, Hall of the Immolated, The Observatory, The Black
      Market. **Still needed: The Forge, The Grand Exchange, The Amber Vault.***
- [ ] **9 nameplates** — engraved plaque / hanging sign per building (name +
      tagline), brand gold-on-dark, in the display font.
- [ ] **The Gate / waking sequence** — dormant (dim, misty) state + the "dawn
      breaks, fires ignite" transition when a wallet connects.

### The Pyre Acolyte (the NFT — also rendered in-app)
- [ ] **Per-stage art:** EMBER, FLAME, FORGE, PYRE (the in-app render frame — we
      need your visual direction per stage). ⚠️ Final rendering approach is **not
      yet locked** (static-per-stage vs on-chain generative SVG — see section 03);
      explore now, hold final production until it's decided.
- [ ] **LP variant** — the gradient overlay marking an LP-burn spirit (every stage).
- [ ] **Immolated variant** — the alchemical sigil overlay (every stage).
- [ ] **"Sleeping" empty state** — the stone pedestal + flame silhouette shown
      before a wallet has forged a spirit.

### The Bonfire (central plaza)
- [ ] **4 flame states** by total burned: Kindling → Burning → Raging → Inferno.

### System & states (used across every screen)
- [ ] **Loading / "ritual" moment** — what waiting looks like ("ritual, not
      broken"): the transition between door and interior, and tx-pending.
- [ ] **Empty-state illustrations** — no Pyre Acolyte yet · nothing staked · cold
      forge · cold market · locked Hall.
- [ ] **Icon / glyph set** — stage marks, LP & Immolated badges, action icons
      (stake, burn, swap, claim), feed/activity glyphs.
- [ ] **Error / rejected-transaction** treatment.

---

## Per-screen deliverables & states

For each screen: **05 · UI Screens** tells you what it contains; here is what to
*design* and which **states** must each have a look. Open the matching screen in
the skeleton to see the exact layout and every state live.

| Screen | Design | States to give a look |
|---|---|---|
| **The Gate** | Dormant village + single lit lantern; the waking sequence | dormant · connecting · awake |
| **The Amber Vault** | Pyre Acolyte hero render; your-position layout | not-connected · loading · **empty (no spirit)** · populated · drip-active |
| **The Forge** | Stake/Burn tabbed action room; fire particle on burn | cold (nothing staked) · active · **drip-draining (locks restake)** · tx pending/confirmed/failed |
| **Hall of the Immolated** | Member view + the **sealed/locked** outsider screen (sigil) | not-connected · **locked outsider** · member · tx states |
| **The Observatory** | Stat-dense readout; the live burn-rate chart | loading · live (no wallet needed) |
| **The Grand Exchange** | Clean swap; honest fee display | idle · quoting · tx pending/confirmed/failed |
| **The Ashen Cup** | Community board + the pre-launch quest funnel | board · quests (locked/available/done tasks) · wallet-submitted |
| **The Bonfire** | The flame (4 states) + live counter | the 4 burn-level states |
| **The Black Market** | Listing cards grid + filters | **empty market (launch — "the market is cold")** · populated |

**Every screen also needs:** wallet not-connected vs connected · a loading/
pending look · an error/rejected look · its empty state. (These are built and
clickable in the skeleton — design against what you see there.)

**Fixed vs. yours:** the *structure* (what each screen shows, the states, the
mobile stacking order) is locked — design within it. The *look* — composition,
colour within the palette, illustration, motion character, texture — is yours.

---

## Mobile is first

Most users arrive on a phone. **Design every screen mobile-first**, desktop
second. On mobile the buildings collapse into one scrolling Dashboard (stacking
order in 05 · UI Screens); on desktop they live behind the village. Same panels,
two frames — so each screen design must work in a narrow column *and* inside a
building.

---

## Delivery format

- **Style values:** a simple list (hex / font / px) — or a Figma styles page.
- **Art:** SVG where it can scale (icons, glyphs, nameplates, Pyre Acolyte);
  high-res PNG/WebP for painted scenes (village, interiors, exteriors).
- **Layered source** (Figma / PSD) for anything that needs separable layers
  (LP & Immolated overlays, the Gate waking sequence, bonfire states).
- **Motion:** a reference clip or written description per animation is enough;
  it gets rebuilt in code.

Deliver per screen as you finish — no need to batch. Each piece drops into its
placeholder as it arrives.
