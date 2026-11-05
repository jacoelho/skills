# Tells

What to allow, what to avoid, and what a generated dashboard looks like. All of these are defaults with reasons.

## Allowed on app screens, with limits

An app screen is read every day, and part of what page advice warns against is the structure of a working screen.

| Allowed | Limit |
| --- | --- |
| **1px borders** on cards, panels, tables, controls | About 1.1-1.3:1 against the ground on light; #1a1a1a on #000, #2e2e2e on #111. Controls one step stronger. A border or a shadow, never both |
| **Row rules** | 1px, 3-7% darker than the surface. No zebra, no header band |
| **Dashed lines** | Empty slots, reference lines, forecasts and pending outlines only |
| **Small labels** above values | 12-14px, sentence case, grey at 4.5:1. Meta and axis text 11-12px. At most one tracked uppercase label on a screen, such as a switcher's context label |
| **Rows of identical cards** | Peer metrics or objects only: 3-6 across, equal widths, one gap, no orphan, no icon on top. Prefer one divided card; mixed spans beat a uniform grid |
| **Monospace** | IDs, keys and code, or every figure as one style's decision. Otherwise tabular figures in the text face |
| **Pills** | Inside rows and beside a value only, 16-24px tall, a pale tint with dark text of the same hue. Never above a heading |
| **Index numbers** | Only as data: a rank, a node number |
| **Icons** | 14-20px outline, one set, grey: in the nav, before a label, or as a single affordance. A container only if neutral, or for node-type tiles in a builder |
| **Shadows** | On what floats. A resting card gets at most a small blur under 8% black |
| **A second typeface** | With one job: a mono for IDs or figures, a serif for one greeting |
| **A gradient** | Only as an area fade under one line chart; a flat tint is safer |

## Avoid

| Avoid | Instead |
| --- | --- |
| Gradients on grounds, buttons, cards, text and KPI tiles | Flat fills |
| Glows, glass, backdrop blur | Opaque surfaces one tone step from the ground |
| An icon in a coloured circle or tinted square on every KPI or card (0 of 23) | A label and a number |
| Rainbow charts: over four hues, a hue per bar, one subject in two hues | One hue per chart, neutrals for the rest |
| Sparklines on KPIs (0 of 23) | The trend in its own chart, or nowhere |
| Emoji in greetings, labels, nav or empty states | Words |
| Placeholder names, vanity figures, totals that do not add up | Believable data computed from rows, listed in the report |
| Status colour on a zero or undefined change | Grey, or the change in words ("+4 (new)") |
| A dark or saturated sidebar on a light screen; a navy or slate dark theme | The page ground for the sidebar; true neutral darks |
| The accent on chrome: a tinted nav row with a left bar, coloured tab pills, a brand fill on every button | The accent on data and at most one control; a near-black primary. `accent-ladder` tints its active nav row by design |
| Uppercase tracked table headers, zebra rows, header bands | 12px grey sentence-case headers; rules or space |
| Left-aligned numbers, proportional figures in columns | Right-aligned tabular figures |
| A hero header, an illustrated welcome banner | A noun title at 24px |
| Pagination under a five-row overview list | Capped rows, "View all", the total |
| A title over 32px or a figure at 48px or more | An 18-32px title and figures at 16-40px; the greeting in `editorial-greeting` is the one exception |
| Icons in boxes down a list or on top of every peer card | One plain 16px icon where it helps, or none |
| Every row a different hue, a "left" amount in green on every budget row | Grey for what is fine; colour only on rows at risk or over |
| A screen that names no product and offers no action | The product's mark and scope in the shell; its main job one click away |
| Decorative imagery | The product's own data, or nothing |

## Tells of generated dashboards

| Tell | What replaces it |
| --- | --- |
| A dark navy or tinted sidebar with a coloured active pill and a left bar | The sidebar on the page ground; a neutral grey pill, or the label brightening on dark |
| "Welcome back, Alex" with a waving hand and a subtitle | A noun title at 24/600 |
| Four KPI cards, each with an icon in a tinted circle | One container split by hairlines, label over value |
| A green "+12.5%" pill on every KPI | A delta on 9 of 20 screens, in words with its window; grey for zero |
| A sparkline on every KPI | The trend has its own chart |
| KPI values over 36px, bold, in the brand colour | The style's `fs-kpi` in ink, with the weight the style sets; `fs-answer` for the one leading figure |
| A gradient area chart with a smoothed spline and a dot on every point | A 2px straight line, usually no fill, no markers |
| A rainbow palette, a hue per bar or per chart | One hue per chart; the accent on data only |
| Gridlines every 20px, axis lines on both sides, a legend for one series | 3-5 faint lines, no y-axis line, no legend for one series, round ticks above the maximum |
| A fat donut with labels on the slices and a big total in the hole | A segmented bar with its parts' values in a legend table |
| Cards with a 16-24px radius, a 1px border and a large soft shadow | A border or a tone step, no shadow; one radius family |
| A zebra table under uppercase headers, with a checkbox, avatar, status chip and kebab on every row | Rules and alignment, 12px grey headers, one status mark, one action where needed |
| Left-aligned numbers in proportional digits | Right-aligned tabular figures, fixed decimals, units in grey |
| Saturated status chips with white text | Pale tints with dark text of the same hue |
| The accent on every button, tab and link | No filled primary on 12 of 23; near-black where there is one |
| A top bar with search, a bell and an avatar on every screen, or one mostly empty | No top bar on 9 of 23; otherwise it carries search, the switcher or the object's name |
| Export, Share and a date picker clustered by the title | Real actions only; a freshness stamp instead |
| Placeholder people, round vanity totals, growth on a week-old account | The product's own data at its real size, totals summed from rows |
| Pagination under a short list | Capped rows and "View all" |
| An equal four-up grid whatever the data, with orphan cells and stretched cards | A column count chosen by item count; spans that change by row and land on the same lines |
| Neon on dark, glowing borders, glass | True neutral darks, lightness steps, colour on the data |
| The kit's own face: Geist or Inter on #f8f8f8 with white 12px cards and no hue on the data, or lime on black | One face from the brief and one element only this product has |
| A coloured icon per category in a list | One grey icon set; colour, if any, on the numbers |
| An illustration and "No data yet" in an empty chart | The zero line drawn, and one sentence in the frame |

A screen with every tell removed and nothing in their place is a tidy template. What fills the space is the product: its own
data at its real size, the screen's one question answered by its biggest block, and a grid whose sums close.
