# Styles

Seven styles, each distilled from the studied screens that share one move. Token names match
[foundation.md](foundation.md): a style's block lists what it sets, and anything it leaves unset comes from the default
block for its theme. `chart-1` always goes on the screen's main data element; in `data-terminal` it is near-white, so that main data carries brightness, not hue.

## Choosing

Choose by how the product is used: long sessions or a quick look, money or media, a team or one person, day or night.
Write one line on why. The first style in a row is not the default. `achromatic-ledger` fits 9 of the 13 kinds, so
picking it needs a reason beyond "it fits".

| Style | Theme | For | The move |
| --- | --- | --- | --- |
| `achromatic-ledger` | light | money homes, reports, settings with usage | No colour in the chrome; one hue on the main data; a small signal where a figure changed |
| `framed-sheet` | light | B2B analytics, developer platforms, builders | One tinted L-frame; the page on a white sheet inset 8px, no shadow |
| `accent-ladder` | light | creator and small-business admin with plans | The full hue on small marks only; its pale tints on every area |
| `editorial-greeting` | light | team and personal homes | The greeting as the h1 in a centred 12-column grid; every figure at regular weight |
| `pastel-consumer` | light | wallets, budgeting | Pale same-hue tiles under one large radius; quiet money polarity |
| `true-black-flat` | dark | community, events, media | Elevation by lightness alone; colour only on data |
| `data-terminal` | dark | markets, monitoring | Every selection is the same 1px accent line; signs, not colour, on numbers |

| Kind | Examples | Styles that suit it | Usual screens |
| --- | --- | --- | --- |
| finance | money homes, budgeting, accounting, seller balances | `achromatic-ledger`, `pastel-consumer` | overview, list, settings |
| wallet | consumer wallets, crypto, personal finance on the go | `pastel-consumer`, `achromatic-ledger` | wallet, list, settings |
| commerce | orders, payouts, products | `achromatic-ledger`, `framed-sheet` | overview, list, detail |
| analytics | B2B analytics, marketing and growth reporting | `framed-sheet`, `achromatic-ledger`, `accent-ladder` | analytics, list, detail |
| devtools | deploys, sessions, API keys, usage | `framed-sheet`, `data-terminal`, `achromatic-ledger` | overview, list, settings |
| builder | flow, form, page and automation builders | `framed-sheet`, `achromatic-ledger` | builder, list, settings |
| creator | newsletters, creator studios, audience insights | `accent-ladder`, `editorial-greeting`, `true-black-flat` | overview, analytics, list |
| smb-admin | small-business and SaaS admin with plans and onboarding | `accent-ladder`, `framed-sheet` | overview, list, settings |
| workspace | team hubs and personal homes | `editorial-greeting`, `achromatic-ledger` | home, inbox, settings |
| community | community, events and media back offices | `true-black-flat`, `accent-ladder` | overview, list, detail |
| support | inboxes, queues, helpdesks | `achromatic-ledger`, `framed-sheet` | inbox, list, settings |
| markets | trading, research, monitoring in long sessions | `data-terminal`, `true-black-flat` | analytics, list, detail |
| report | generated or exported reports with no app around them | `achromatic-ledger`, `framed-sheet` | report |

A colour budget measures chrome and scattered marks. A map or plan whose every cell is data may exceed it; say so in the
report.

A product outside these kinds: take the kind it is used most like. Keep the style's one move intact, and apply it only
where it carries meaning; a tray around every card and an icon rail where people needed labels both failed in testing.
The `fs-title: 48px` in `editorial-greeting` is the only title over 32px: it holds for the serif greeting on a home and
nowhere else.

## Achromatic ledger (`achromatic-ledger`)

Light, sparse. Shell: `open-plane`; alternatives: `icon-rail`, `no-sidebar`. Evidence: 4 screens: a seller home, a per-agent insights page, a generated report, a settings page with usage numbers.

**Idea.** The chrome holds no colour at all; money and counts are set in ink, the one chart hue marks the screen's main data element, and the only other hue is a small signal where a figure changed.

**Move.** No brand colour anywhere in the chrome: the one primary action is near-black (a grey pill, #e5e5e5, is the secondary), the main data element (today's series, the booked bars, the current period) takes the one chart hue, #1d5fbf, and everything else is drawn in ink with the comparison or the part after the cursor in grey, zero balances are set in grey, and the only hue on the screen is a small triangle or a short coloured number where a figure changed.

**Colour budget.** Under 1% coloured pixels; the chrome is ink, the one chart hue goes on the main data element, and the only other hue is a small change signal.

**Type.** Geist, falling back to Inter, system-ui, sans-serif. Second face: Geist Mono, for IDs and keys only. Weights 400, 500, 700. 700 is for money figures only; every other number is 400-500.

```
ground: #f8f8f8  surface: #ffffff  raised: #eeeeee
border: #e6e6e6  rule: #f0f0f0  control: #d4d4d4
text: #0a0a0a  muted: #6b6b6b
accent: #141414
positive: #2d7a31  negative: #c4242a  warning: #92400e
chart-1: #1d5fbf  chart-2: #141414  chart-3: #878787
pill-positive-bg: #dcfae5  pill-positive-ink: #04250e
pill-negative-bg: #ffedea  pill-negative-ink: #831c1e
pill-warning-bg: #fffbeb  pill-warning-ink: #92400e
pill-neutral-bg: #eeeeee  pill-neutral-ink: #3d3d3d
radius-card: 8px  radius-control: 6px
sidebar-width: 256px  row-height: 44px  control-height: 36px  gap: 12px  pad: 24px
fs-title: 24px  fs-section: 16px  fs-kpi: 30px  fs-body: 14px  fs-small: 12px
```

**Face options.**

- A ground from the product's world in place of #f8f8f8, one level off white and low in chroma: a stone (#f4f3f1) for a bakery or a shop, a sage (#f2f5f2) for a garden or a greenhouse, a blue-grey (#f2f4f7) for a ledger or a meter. Cards stay white; keep a warm tint low in saturation (under about 15%).
- The one chart hue (#1d5fbf, or the brand's own hue at 3:1 or more on white) on the screen's main data element: today's line, the booked bars, the current period's column, the margin that breaks. The chrome stays ink and the hue stays under 1% of the screen.
- Every figure in Geist Mono, as the style's decision, so money and counts read as a ledger's columns while the text stays Geist. Say so in the report.

**Avoid.**

- a brand-coloured primary button
- tinted cards or tinted KPI tiles
- bold on anything but money
- a chart with no y-scale (the study's one example of this look hid magnitude behind hover and was flagged)
- a grey pill as the only button for the screen's main job: in testing an Approve repeated in grey on every row left the screen without a primary

## Framed sheet (`framed-sheet`)

Light, medium. Shell: `framed-sheet`. Evidence: 6 screens: a developer platform overview, an analytics overview, an events analytics tab, a list detail, a reports dashboard, a flow builder.

**Idea.** The app chrome is one tinted L-shaped frame; the work sits on a white sheet with a hairline edge and soft corners, so depth comes from a single tone step and no shadow.

**Move.** One tinted frame holds the sidebar and the 48px top bar with no rule between them; the page is a white sheet inset 8px from the window's right and bottom edges, with a 1px edge, 16px corners and no shadow. The active tab is a 2px underline in ink or the accent; everything else in the chrome is grey.

**Colour budget.** Under 3%; the brand shrinks to the logo and a 2px tab underline, the data carries the chroma.

**Type.** IBM Plex Sans, falling back to Inter, system-ui, sans-serif. Second face: IBM Plex Mono, for IDs and keys only. Weights 400, 500, 600. KPI values at 400; the semibold goes on the label and the active tab.

```
ground: #f9fbfc  surface: #ffffff  raised: #f4f6f8  active: #ebedee
border: #e8eaec  rule: #f0f1f2  control: #cdced1
text: #131416  muted: #5d5f60
accent: #1b6c80
positive: #1d784d  negative: #c4242a  warning: #92400e
chart-1: #1b6c80  chart-2: #6b7280  chart-3: #a86f0c
pill-positive-bg: #dcfae5  pill-positive-ink: #04250e
pill-negative-bg: #ffedea  pill-negative-ink: #831c1e
pill-warning-bg: #fffbeb  pill-warning-ink: #92400e
pill-neutral-bg: #ebedee  pill-neutral-ink: #353736
radius-card: 8px  radius-control: 6px  radius-sheet: 16px
sidebar-width: 228px  sheet-inset: 8px  row-height: 48px  control-height: 32px  gap: 24px  pad: 24px
fs-title: 22px  fs-section: 16px  fs-kpi: 28px  fs-body: 14px  fs-small: 12px
```

**Face options.**

- The frame tinted from the product's colour in place of #f9fbfc: one low-chroma step of its hue (a green-grey for a climate or farm tool, a blue-grey for an observability tool, a stone for a print shop). The sheet stays white.
- The brand's own hue from the brief as `chart-1` in place of the default teal, on the main series and the one selected state, at 3:1 or more on white.
- IBM Plex Mono for IDs, keys and the figures in tables (one job): its figures have their own drawing, and a developer reads them as the product's.

**Avoid.**

- a border between the sidebar and the top bar
- a shadow under the sheet
- cards whose border is heavier than the sheet's (#cdcfcf on cards read as heavy in the study)
- a fourth nesting level: frame, sheet and card are enough
- different gutters for the KPI row and the chart row (20 against 24 was flagged)

## Accent ladder (`accent-ladder`)

Light, sparse. Shell: `open-plane`; alternatives: `ruled-t-frame`. Evidence: 3 screens: a newsletter home, a network analytics overview, a cap-table company home.

**Idea.** One brand hue at full strength only on small marks, and its pale tints doing all the area work: the active nav row, a plan card, badges and progress tracks.

**Move.** The full hue goes only on small marks: the one filled-button style, the data series and the active nav icon. Its 50-200 tints carry every area: the active nav row (tint fill with the dark ink of the hue), the plan or trial card, badges and progress tracks. The primary action may instead be near-black, as on the study's newsletter home.

**Colour budget.** 3-10%, nearly all of it as pale tints of the one hue.

**Type.** DM Sans, falling back to Inter, system-ui, sans-serif. Weights 400, 500, 600, 700. 700 for the page title only.

```
ground: #f9fafb  surface: #ffffff  raised: #f3f4f6
border: #e5e7eb  rule: #f2f2f2  control: #d1d5db
text: #111827  muted: #5f6672
accent: #b8336a  accent-soft: #fdf2f7  accent-track: #f8dbe8  accent-ink: #6b1d3e
positive: #23784e  negative: #c4242a  warning: #92400e
chart-1: #b8336a  chart-2: #6b7280  chart-3: #d4618f
pill-positive-bg: #dcfce7  pill-positive-ink: #14532d
pill-negative-bg: #ffedea  pill-negative-ink: #831c1e
pill-warning-bg: #fffbeb  pill-warning-ink: #92400e
pill-neutral-bg: #f3f4f6  pill-neutral-ink: #374151
pill-accent-bg: #fdf2f7  pill-accent-ink: #6b1d3e
radius-card: 8px  radius-control: 6px
sidebar-width: 230px  row-height: 45px  control-height: 32px  gap: 24px  pad: 24px
fs-title: 32px  fs-section: 18px  fs-kpi: 24px  fs-body: 14px  fs-small: 12px
```

**Face options.**

- The ladder built from the brand's own hue (its logo, the brief's object) in place of the default raspberry: the full hue on small marks, its pale tints on areas.
- The product's objects in the lead block: the newsletter's latest issue as its cover, the shop's products as 40px thumbnails, the course's lessons with their own art.
- A ground one level toward the hue's palest tint (#fbf7f8 for the raspberry) in place of #f9fafb, so the page and the tints read as one family.

**Avoid.**

- the full hue on large areas
- a second accent family (four families on one screen was flagged in the study)
- a gradient on the trial chip or upgrade button
- a left accent bar on the active nav row on top of the tint (seen once in 23 screens)

## Editorial greeting (`editorial-greeting`)

Light, sparse. Shell: `open-plane`; alternatives: `framed-sheet`. Evidence: 2 screens: a team workspace home and a personal insights home.

**Idea.** A personal or team home that opens with a typeset greeting in a centred column; every number below it is set at regular weight on tonal panels.

**Move.** The greeting is the h1, in a centred 1100px column on a real 12-column grid (77px columns, 16px gutters), with spans that change by row but share column lines (3/3/3/3, then 9/3, then 6/6, so every internal edge meets one above it). Every figure below is set at regular weight on tonal panels, one layer each: a panel one step off white holds its title and its content directly; a white inner card is used once, for the main chart.

**Colour budget.** Under 2% for the accent; tonal panels carry the structure.

**Type.** Instrument Sans, falling back to Inter, system-ui, sans-serif. Second face: Instrument Serif, for the greeting only. Weights 400, 500, 600. The 48px title is the serif greeting; set in the sans it is 24/400. Every figure is 400.

```
ground: #ffffff  surface: #f9f9f9  raised: #ffffff
border: #eaeaea  rule: #f3f3f3  control: #d9d9d6
text: #1f201d  muted: #636361
accent: #1b6e66
positive: #2d7a31  negative: #b42318  warning: #92400e
chart-1: #1b6e66  chart-2: #1f201d  chart-3: #898985
pill-positive-bg: #dcfae5  pill-positive-ink: #04250e
pill-negative-bg: #fdecea  pill-negative-ink: #7a1d14
pill-warning-bg: #fffbeb  pill-warning-ink: #92400e
pill-neutral-bg: #f3f3f3  pill-neutral-ink: #3d3d3a
radius-card: 22px  radius-control: 999px
sidebar-width: 224px  row-height: 63px  control-height: 38px  gap: 16px  pad: 20px
fs-title: 48px  fs-section: 14px  fs-kpi: 32px  fs-body: 14px  fs-small: 12px
```

**Face options.**

- The greeting names this team or household and today's one fact, set from the data ("Morning, Okoro house. The car is ready by 06:10."), never "Welcome back".
- Each person's stable hue as a pale tint on their avatar and their own lane or column (a couple and their joint account as three lanes): identity, not data, so it stays out of the chart legends.
- A surface from the product's world in place of #f9f9f9, one level toward its material (a sage for a garden, a stone for a kitchen, a blue-grey for a studio), with the page white kept.

**Avoid.**

- an emoji in the greeting
- a tracked uppercase date above the greeting (put the date after it or in the grey line below)
- a 624-864px column on a desktop screen (both were flagged as wasted width)
- a tray around every card (a grey panel with a white card 6px inside it, on every block, read as a bento template in testing)
- red as the accent: in testing red marked a record week of upgrades and read as an alarm; red is for the failing fact only

## Pastel consumer (`pastel-consumer`)

Light, medium. Shell: `open-plane`; alternatives: `icon-rail`. Evidence: 2 screens: a wallet home and a personal finance home.

**Idea.** Categories are coded by pale tints whose ink is the dark of the same hue, all under one large radius, and each headline sum sits inside the card that explains it.

**Move.** Pale category tiles with the dark of their own hue as ink (#dcf1ff with #0a3a80), one large radius (20px on cards, stepping down to 10, 8 and 5 inside), and quiet money polarity: income green with a plus sign, spending in ink, no red on ordinary outgoings. Tints go on small tiles, avatars and chips; a panel that holds a list stays white. When the product has people (two partners, a family), each gets one hue, at least 60 degrees from the next.

**Colour budget.** 5-8%, as pale tiles and data marks.

**Type.** Manrope, falling back to Inter, system-ui, sans-serif. Weights 400, 500, 600. Money at 24-32px; card titles regular; semibold for net worth, bill amounts and actions.

```
ground: #f3f5f7  surface: #ffffff  raised: #f2f8fd
border: #e6e6e6  rule: #f4f4f4  control: #d6d9dd
text: #1b1d1f  muted: #5c6064
accent: #1d5fd6  accent-soft: #dcf1ff  accent-ink: #0a3a80
positive: #2f7a45  negative: #c41c29  warning: #92400e
chart-1: #1d5fd6  chart-2: #b45309  chart-3: #2a8798
pill-positive-bg: #dcfae5  pill-positive-ink: #04250e
pill-negative-bg: #ffedea  pill-negative-ink: #831c1e
pill-warning-bg: #fffbeb  pill-warning-ink: #92400e
pill-neutral-bg: #eef1f4  pill-neutral-ink: #3a3d40
pill-accent-bg: #dcf1ff  pill-accent-ink: #0a3a80
radius-card: 20px  radius-control: 10px
sidebar-width: 240px  row-height: 72px  control-height: 40px  gap: 24px  pad: 24px
fs-title: 28px  fs-section: 20px  fs-kpi: 32px  fs-body: 16px  fs-small: 14px
```

**Face options.**

- The tile hues from the account's own colours (the card's colour, each pot's colour in the app) in place of the default cobalt, each tile pale with the dark of its own hue as ink.
- The money's own objects: the card art at its real ratio, merchant marks at 24px in the rows, the goal's picture on its pot.
- Manrope's figures carry the balance: 30-36px at 600 with tabular figures and the pence in a smaller grey, so the number itself is the face.

**Avoid.**

- a gradient balance card
- two data palettes on one page (flagged in the study)
- red on every outgoing amount
- a 624px phone-width column on a desktop screen (flagged as a stretched phone screen)
- a KPI strip on top: the sums belong in their cards
- whole panels tinted per person or category beside white cards (two surface languages on one screen)

## True-black flat (`true-black-flat`)

Dark, medium. Shell: `ruled-t-frame`; alternatives: `no-sidebar`. Evidence: 5 screens: an events back office, an event analytics tab, a community overview, an artist studio home, an artist insights page.

**Idea.** Night mode on true black: sidebar, top bar and page share one ground, elevation is a lightness step alone, and colour is confined to data marks.

**Move.** Elevation by lightness alone (#000 ground, #111 card, #2a2a2a nested panel) with no borders or shadows on cards; the active nav item is marked only by its label going from #bbb to #fff; the primary control is made primary by inversion, a white 36px pill with black text.

**Colour budget.** At or under 3%; the accent never touches buttons, tabs or nav.

**Type.** Inter, falling back to system-ui, sans-serif. Weights 400, 500, 600. Nothing above 600; inactive nav labels #bbb, active #fff.

```
ground: #000000  surface: #111111  raised: #2a2a2a
border: #1a1a1a  rule: #161616  control: #444444
text: #ffffff  muted: #b4b4b4  faint: #949494
accent: #c6f24e
positive: #c6f24e  negative: #e9676b  warning: #e5a93b
chart-1: #c6f24e  chart-2: #e6e6e6  chart-3: #747474
pill-positive-bg: #222a10  pill-positive-ink: #c6f24e
pill-negative-bg: #2c1a20  pill-negative-ink: #e5566f
pill-warning-bg: #2b2414  pill-warning-ink: #e5a93b
pill-neutral-bg: #222222  pill-neutral-ink: #ffffff
radius-card: 20px  radius-control: 999px
sidebar-width: 210px  row-height: 80px  control-height: 36px  gap: 14px  pad: 22px
fs-title: 20px  fs-section: 16px  fs-kpi: 24px  fs-body: 14px  fs-small: 12px
```

**Face options.**

- The one data hue from the product's world in place of the default lime: a solar amber (#f2b33d) for an energy home, a sky blue (#4cb3f0) for water or weather, a lime only for sport. It is still the only hue on data and never touches buttons, tabs or nav. Swapping it sets `positive` and its pill back to the dark defaults. A green or yellow-green hue is also `positive`; an amber that sits beside `warning` leaves the warning to its pill pair.
- A ground with the product's temperature: the studied #000 for media and events, a warm near-black (#0e0d0c) for a home, a cool one (#0c0d0f) for a monitor, with cards one lightness step above it (#181716, #15171a). Never navy or slate.
- A signature element from the product's world as the lead: the energy home's power flow (sun, house, battery and grid with their live kW), an event's doors against capacity, an artist's release with its cover.

**Avoid.**

- a navy or slate dark theme
- glow, neon borders or shadows
- a hue per chart (five hues across four charts was flagged)
- the accent on buttons, tabs or nav
- a 64px top bar left empty across most of its width (flagged twice)

## Data terminal (`data-terminal`)

Dark, dense. Shell: `icon-rail`. Evidence: 1 screen: a stock research view. Keep it narrow..

**Idea.** A research or monitoring screen read in long sessions: cards darker than the ground, tabular digits that stack, signs instead of colour, and every selection marked by the same 1px accent line.

**Move.** Every selection (tab, toggle, range, nav item) is a 1px accent line exactly as wide as its label, placed on the nearest existing edge; numbers stay white or grey and carry their sign in the text ('+$24,000,000').

**Colour budget.** Under 3%; the accent is never more than a 1px line.

**Type.** Public Sans, falling back to Inter, system-ui, sans-serif. Weights 400, 500, 600, 700. Section titles 20/400 in the muted grey; card titles 16/600; tabular figures everywhere.

```
ground: #171719  surface: #131217  raised: #212023
border: #222224  rule: #1b1a1f  control: #3a3a3e
text: #ffffff  muted: #8a8c92  faint: #8a8c92
accent: #4a8ad6
positive: #44a282  negative: #e65b73  warning: #d9a441
chart-1: #f2f2f3  chart-2: #e5566f  chart-3: #4a8ad6
pill-positive-bg: #1b2828  pill-positive-ink: #5fc39c
pill-negative-bg: #2c1a20  pill-negative-ink: #e5566f
pill-warning-bg: #2a2416  pill-warning-ink: #d9a441
pill-neutral-bg: #212023  pill-neutral-ink: #bdbdc0
radius-card: 6px  radius-control: 999px
sidebar-width: 50px  row-height: 42px  control-height: 34px  gap: 24px  pad: 32px
fs-title: 26px  fs-section: 20px  fs-kpi: 20px  fs-body: 13px  fs-small: 12px
shadow: 0 12px 28px rgba(0,0,0,.2)
```

**Face options.**

- Every figure in a monospace as the style's decision (IBM Plex Mono or JetBrains Mono for each price, count and time, digits that stack), with the text in Public Sans. Say so in the report.
- The one accent line from the product's world in place of the default blue (the exchange's or the team's hue): still the only selection mark.
- A signature of the market or the system as the lead: an order book's depth as two mirrored bar lists, an incident as a minute-by-minute strip, a region map with the list beside it.

**Avoid.**

- filled pill tabs or a coloured segmented control
- a chart with no scale and no dates (the studied screen had none and was flagged)
- tertiary text under 4.5:1 (#4c4c4f read at about 2:1 in the study)
- lighter cards with borders and a glow
- green and red on every number; the one column whose job is "what moved today" and a negative headline figure may carry the polarity colours
