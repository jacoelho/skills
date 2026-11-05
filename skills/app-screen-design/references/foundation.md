# Foundation

Type, colour, surfaces and default tokens. A style in [styles.md](styles.md) sets its own values; the blocks at the end of
this file resolve everything it leaves unset.

## Type

- **One grotesk.** All 23 screens use a neo-grotesk, and 14 use that family alone. A second face has one job: a monospace
  for every number or for IDs only, a serif for one greeting, a brand face for the wordmark. Never three. Axis ticks and
  chart notes stay in the text face even when IDs are in a monospace.
- **App type is not display type.** The h1 stays at 18-32px and no figure reaches 48px. A 50px serif title and a 76px
  balance made a budgeting screen read as a landing page. The one exception is the serif greeting in
  `editorial-greeting`.

| Role | Range in the study | Median |
| --- | --- | --- |
| Page title | 14-48 | 24 |
| KPI value | 16-40 | 24-26 |
| Card title (500-600) | 14-24 | 16 |
| Body, nav, cells | 13-16 | 14 |
| Labels, meta | 11-14 | 12 |
| Axis ticks | 11-16 | 12 |
| Pills, badges | 9-14 | 11-12 |

- **Scale.** A screen uses 4-9 sizes, median 6. The cleanest scales were 12/14/18/24, 12/14/16/30 and 12/14/16/24. Nothing
  under 11px (*judgement*).
- **Weights.** A median of 3 per screen. 10 of 23 never go above 600. 700 does one job per screen: money, the greeting or
  the title.
- **Figures.** Tabular on every number in a table, in a KPI, or anywhere it updates. Check that digits really are one width, through
  `font-variant-numeric: tabular-nums` or by the face's design; if they are not, take another face.
- **Case and tracking.** Sentence case on about 19 of 23. Tracking 0, and negative only on large type (-0.02em at 32px).
  Line height 20px for 14px text, 24px for 16px.
- **Dark screens** set body at 13px on three of six, and titles at 18-20/600 or 26-28/700.

## Colour on light screens

- **Ground models.** White cards on an off-white ground (10 screens), grey panels on white (6), or a framed sheet (7).
- **The sidebar is never dark or saturated** (0 of 17). It matches the page, sits 1-3 levels off it, or is white on a grey
  page.
- **Lines in three steps.** Card edges about #eaeaea, row rules one step lighter (#efefef-#f4f4f4), control borders one
  step darker (about #d1d5db). #cbcecd on cards reads heavy; #f5f5f5 disappears.
- **Text in three tiers.** Primary about #111, secondary about #606060, tertiary no lighter than the contrast floor below.
- **Accent placement.** On data only with greyscale chrome (4 screens), on actions only (2), or no accent at all (2). The
  primary button is usually near-black. Every screen with more than one accent family is flagged.
- **Status.** Use a dark enough green for text; the greens in the study (#16a34a-#40a670) fall under 4.5:1. Use the pale
  pill pairs below. A count badge is #c4242a-#dc3532.

## Colour on dark screens

- **Ground.** True neutrals: #000 (3 screens), #111 (2), #171719 (1). No navy and no slate.
- **Surfaces,** three ways: a lighter step with no border (#111 on #000), the ground's own fill with a 1px line (#2e2e2e on
  #111), or darker than the ground with a soft shadow (once).
- **Lines.** Structural lines sit 22-31 levels above the ground. Interactive outlines are brighter, #373737-#4c4c4c, so an
  outlined button reads as clickable without a fill.
- **Text.** Two greys at most, far enough apart to read as two: about #b4b4b4 and #949494. #aaaaaa, #969696 and #bbbbbb on
  one screen read as one grey used three ways.
- **Accent** on data only or on one selected state. Active nav by brightness. Emphasis without colour: an inverted white
  pill, a grey-filled button (#212121), an outline.
- **Status** is a hue on a dark tint of itself: #3fc07a on #172a1d.
- **A green or yellow-green accent is also `positive`,** on light screens too. A mint "+£3.81" beside a lime "Sold" read as
  two greens. Otherwise let the sign carry the meaning in neutral ink.
- **Colour share** was at or under 3% on all six.

## Contrast floors

*Judgement; the study itself falls short.*

- Every tier carrying words reaches 4.5:1 on the surface it sits on, placeholders included. #6b6b6b is about the lightest
  grey that holds on white and on #f9fafb.
- Data marks reach 3:1 on their surface.
- Disabled controls stay legible and say why they are disabled.

## Surfaces, radius, icons, spacing

- **Edges.** A 1px border separates surfaces on 12 of 17 light screens. Use a border or a shadow, never both. Existing
  shadows are faint (alpha .06 or less at 0 2px 8px). Real shadows are for what floats: a menu, a popover, a tooltip, a
  dialog, a composer.
- **Radius is bimodal.** Tight, 4-8px (9 screens), or soft, 16-24px (10); 11-12px on only 3. Controls follow the cards.
  Nested radii step down (20, 10, 8, 5, 4). Keep to three panel radii at most.
- **Group, don't box.** A set of KPIs is one card split by 1px dividers, or a bare strip with 48-52px vertical dividers.
- **Icons.** Outline on 22 of 23, one set. Nav icons 14-20px at about 1.5px, inline icons 12-14px, about 10px to the label,
  grey. Never in a saturated circle (0 of 23). A container, if any, is neutral or codes a node type in a builder.
- **Spacing** on a 4px base. Card gap 6-24px, median 16. Card padding 12-34px, median 20. Section gap 24-64px. Control
  height 27-40px, median 34.

## Default tokens

These start from the study's medians, with greys moved to pass 4.5:1; the neutral pill and the dark warning pair are judgement. Token names are used unchanged in [styles.md](styles.md).
`pad` is card padding. `gutter` is the canvas side padding. A style with `radius-card` of 16px or more uses
`radius-chip: 999px`.

Light:

```
ground: #f9fafb  surface: #ffffff  raised: #f9f9f9  active: #eeeeee
border: #e8e8e8  rule: #f2f2f2  control: #d1d5db
text: #111111  muted: #5f6368  faint: #6b6b6b
primary: #1d1f20
positive: #237a4f  negative: #c4242a  warning: #92400e
pill-positive-bg: #dcfae5  pill-positive-ink: #04250e
pill-negative-bg: #ffedea  pill-negative-ink: #831c1e
pill-warning-bg: #fffbeb  pill-warning-ink: #92400e  notice-border: #fde68a
pill-neutral-bg: #eeeeee  pill-neutral-ink: #3d3d3d
grid: #e5e5e5  chart-span: 0.06
```

Dark:

```
ground: #000000  surface: #111111  raised: #222222  active: #222222
border: #1a1a1a  rule: #161616  control: #444444
text: #ffffff  muted: #b4b4b4  faint: #949494
primary: #ffffff
positive: #3fc07a  negative: #e9676b  warning: #e5a93b
pill-positive-bg: #172a1d  pill-positive-ink: #3fc07a
pill-negative-bg: #2c1a20  pill-negative-ink: #e9676b
pill-warning-bg: #2b2414  pill-warning-ink: #e5a93b  notice-border: #4a3a14
pill-neutral-bg: #222222  pill-neutral-ink: #ffffff
grid: #2b2b2b  chart-span: 0.12
```

Either theme:

```
radius-card: 8px  radius-control: 6px  radius-chip: 4px  radius-sheet: 16px  sheet-inset: 8px
gap: 16px  pad: 20px  gutter: 24px
nav-row: 34px  control-height: 32px  row-height: 48px  sidebar-width: 230px
font: Inter, system-ui, sans-serif
fs-title: 24px  fs-section: 16px  fs-kpi: 24px  fs-answer: 32px  fs-body: 14px  fs-small: 12px
```

- `primary` is the filled button: near-black with a white label, or white with a black label on dark.
- `fs-kpi` is a KPI value when no single figure leads. When one figure answers the screen it takes `fs-answer`, in every
  style, and its sibling figures drop to 18-24px.
- `accent-soft`, where a style does not set it, is `accent` at 12% over `surface`.
- `chart-2` and `chart-3` are context slots beside the one main series, and some are neutral on purpose. When several
  series each need their own identity, keep `chart-1` first, take the rest from the categorical order in `dataviz`, and
  run its validator.
- `faint` is for placeholders and meta. `chart-span` is the opacity of a shaded span in a chart.
- `accent` and `chart-1` to `chart-3` have no default: every style sets them, and a brand replaces them.
