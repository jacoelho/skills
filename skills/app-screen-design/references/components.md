# Components

KPIs, app-specific charts, tables, lists, forms, settings and data states.

## KPIs

- **No tile of its own.** 11 of 20 screens with headline numbers give a KPI no tile. The default is one container split by
  1px dividers into equal columns. 7 screens have no KPI row and put each headline number in the card explaining it, which
  is often better.
- **Count.** 1-6 per row, median 3-4, and the count matches the grid.
- **Size.** Values 16-40px, median 24-26, about 1.7 times the label. Labels 12-16px, sentence case, usually grey, above the value.
- **Weight.** 400 on 8 screens, 600 on 6, 700-800 on 6. A large regular number under a semibold label is common. Bold for money
  only.
- **Nothing else.** No icon in a coloured circle, no sparkline, no tinted tile. An info icon by the label is fine. Units are a
  smaller grey suffix: "5 mins" at 24 over 14.
- **The answer figure leads.** When one figure is the screen's answer, it takes `fs-answer`, 30-36px and at least 1.3 times its
  siblings, which sit at 18-24px. No other figure is larger.
- **One figure, one place.** Do not repeat a strip figure in a legend beside it. Drop a strip whose every cell names a panel
  below, and lead each panel with its own number.
- **A second job.** KPIs may be a chart's series tabs or a list's type filter. As tabs, the selected one carries a 2px rule or
  the active fill and an ink label; the others keep a grey label and their value in ink, at 400 against 500. A grey value
  reads as disabled. When the tabs are the per-entity breakdown the brief asks for, grey nothing and let the rule alone mark
  the selection. On a phone they become a 2-up grid with the selected cell filled, or a sideways row.

### Deltas

- Optional: 9 of 20 KPI screens show one.
- 10-15px, never larger than the label, as text, a small glyph, or a pale pill.
- **The window in words:** "vs prior 30 days".
- **Colour only the number,** or set the whole delta in grey.
- **Colour says good or bad, not up or down** (*judgement*). Latency, errors, cost and churn improve when they fall. A bad move
  takes `negative`; a good move takes `positive` or grey.
- **Zero or undefined change is grey.** Never three green "up 100%" pills grown from zero, a ">999%", or a bold red "0.00%".
  From a prior zero, write "+4 (new)". With nothing to compare, use a short grey dash.

## Charts

Build charts with `dataviz`, using the style's `chart-1` on the main data element. Where `dataviz` and this skill differ, the
table in [SKILL.md](../SKILL.md) decides. This section covers what `dataviz` does not.

### Axes, marks and legends

Measured values `dataviz` leaves open. It decides anything not listed here.

- **Y ticks:** 4-7 in round, even steps, with the top tick above the maximum and integers for counts. Never drop the scale in
  favour of hover: two screens did and both were flagged.
- **Axis text is no larger than the data,** 11-12px in grey.
- **X labels:** 4-8, flat, never rotated, on one step all the way. Choose a step that lands on the end, or leave the end
  unlabelled. Labelling only the two ends hides when things happened. Dates go on a time scale.
- **Lines** are straight segments; a smoothed curve invents values. No point markers except on hover.
- **Fill:** none on 7 of 10 time charts. At most a flat tint.
- **Legends:** none for one series, five items at most, never a series with no data. Every swatch is the mark it explains,
  scaled down, built from the same values as the mark.

### Forms for app questions

All *judgement* except where noted.

| Question | Form |
| --- | --- |
| How much of the plan is used? | **Plan against actual:** a track as long as the plan, the spent part filled, what is already committed as a lighter segment, an overrun past the track's end in `negative` |
| Has it drifted from its target? | **Bullet:** one row per part, the current share as a bar with a 1px tick at the target; never two stacked bars to compare |
| Which way did it flow, and how much? | **Diverging columns:** columns above and below one zero line on one scale, the axis signed and captioned on each side ("Sold" above, "Bought" below), a marked period in a second tone with its own legend entry |
| Who is away when? | **Timeline:** people by day, each kind of booking with its own mark (calendar rule below) |
| Is there enough cover? | **Cover matrix:** a team-by-day grid of slack against the minimum (+2, +1, 0, −1), one hue ramping toward `negative`, the headcount on hover |
| When in the day, against last time? | **Time strip:** one row per item on a shared opening-to-closing axis, a 2px grey track, an ink dot for today, a hollow tick for the comparison day |
| Per period, and the running total? | **Pair** (seen once in the study): the two side by side at equal width, with the same dates |
| Where? | **Map with a list beside it** (seen once): the list carries the magnitudes |

When there are only a few numbers, draw no chart. Four screens skip it, and the settings page links out with "View more".

### Charts on a screen

- **One question, one series.** One series is the norm and three the most any screen draws. Switch metrics with a control rather
  than overlaying lines. Plots run 112-264px tall, median about 195.
- **The hue goes on the main data element:** today's series, the booked bars, the current period, the margin that breaks. An
  all-ink screen with no hue on its data read as a kit. Neutral series around it are fine.
- **One subject keeps one hue across the screen.** Unrelated hues on one screen are flagged every time. Four hues at most.
- **The per-period and running-total pair appears once per screen,** only when the total crosses a line that matters.
- **A series flat except for one event** gets at most two-thirds of the width and about 140px of height, or a range capped at
  about twice its reference line with the off-scale peak labelled.
- **A forecast is not a fact.** After today the line is dashed and the end value labelled, with the gap to any target
  bracketed.
- **What the brief asks to see over time is on the first screen.** KPI cells may switch the chart only between metrics the brief
  did not name.
- **Annotate the event that matters.** A step or spike over about three times the usual change gets a 1px marker and a 12px
  label naming its cause ("Deploy a3f09c1"). Reference lines (a budget, an SLO) are 1px dashed with their label at the end.
- **Labels never collide.** Annotation labels sit in rows above the plot beside their own leader line. Reserve those rows only
  when a label exists. Lay labels out after fonts load.
- **Short and empty histories are drawn honestly:** a flat zero line with one spike, missing bars for empty periods, no padded
  range. A lone point does not get the largest plot on the screen.
- **Progress bars** are 4-24px tall, median 8, with both ends labelled and the fill at the true ratio. A zero has no stub.
- **Tooltips** are bare text or a plain box without an arrow: label and value on one line.

### Calendars and timelines

*Judgement; the study has none.*

- People down the left on a fixed 160-220px column, grouped under a team subheader.
- Days across with faint 1px day lines, weekends one tone step darker, today a 1px line in the one data hue with its date in ink.
- Bars are 20-24px tall at radius 4. One-line names sit on a 32px pitch; a name with a subline needs 40-44px.
- **Every kind of booking has its own mark:** holiday a pale fill, off sick a 1px diagonal hatch, long leave a darker grey step,
  working away an outline, a pending request a dashed outline. Full colour is only for what needs a decision.
- A label sits inside its bar. A bar too short for it shows the kind's code with the label in its tooltip, or the label after the
  bar's end, never over the days before it.
- Every legend swatch is the mark itself, scaled down, listing only kinds on screen.

## Tables

### Rows

- Single-line rows 36-53px, median 45. Two-line rows with media 56-92px, median 72: media height plus 24-32px.
- Key-value and legend rows inside cards 21-32px.
- In a two-line cell, line 2 sits about 21px below line 1, one size smaller and grey. Two-line labels need at least a 40-44px
  pitch.
- Overview lists in the study show 2-5 rows; the cap is 6.

### Header

- 11-14px, median 12, regular weight, grey, sentence case. No fill band (0 of 11). No rule under it on 8 of 11; where there is one,
  it is the strongest line in the table.
- Header row 36-40px.
- Numeric headers are right-aligned and flush with their values. A header over a control aligns with that control.
- A sort glyph on the active column only.

### Dividers

- No zebra striping (0 of 23).
- About half the lists have no row dividers, relying on pitch or small gaps.
- When present: 1px, 3-7% darker than the surface. Pick one extent per screen: bleeding 8-9px past the text, starting at the text
  column, or the full inner width.

### Figures and alignment

- **Numbers are right-aligned** in tabular figures or a monospace.
- **Fixed decimals per metric:** money 2, percentages 1 or 2, counts none. Thousands separators everywhere; abbreviate only in a
  capacity line ("12.7k of 20.0k"). A sign on every change ("-$0.09"). No space after a currency sign.
- **The identity column gets the most width,** about a third to a half, and is never cut off at desktop width. Shorten names
  editorially first.
- **One right edge per row or card.**
- **Two measures stack in one cell:** a count over its 12px grey percentage, a date over its time.
- **Dates:** ISO form and right-aligned where rows are compared; words for recency ("Today", "6 days").
- **IDs:** monospace at body size, truncated to about 8 characters, a copy icon 12px after.
- Truncate to one line with an ellipsis; never break inside a word.
- **A breakdown in a narrow card** uses fixed mini-columns or `nowrap` items, so no line ends on a dangling "·".
- **An edited cell shows that it changed** (*judgement*) with a dot or tinted border, and a caption names the baseline.

### Ink inside rows

- Only the identity and the key number get primary ink; everything else is grey ("5" in ink, " /10" in grey).
- A missing value is a grey dash; a real zero is printed.
- The sign lives in the text, not the colour: income green with a "+", expenses in ink, no red on every negative.
- Link colour on the name cell only, with no underline.

### Status pills

- 15-28px tall, median 20, text 11-14px at 500 (the study runs 9-14; under 11 is too small). A full pill or a 3-5px tag, using the pill token pairs.
- Neutral states are monochrome chips with a glyph.
- A state machine uses one hue at three intensities: grey for off, the full hue for the call to action, a dark tint for running. A
  saturated fill with white text is for that call to action only while it is rare. When more than about a fifth of visible rows
  carry it, use the pale pair or a 6px dot with an ink label.
- **One status mark per row.**
- **A chip is never squeezed:** `flex: none; white-space: nowrap`.

### Media

Optional, and only for the product's own data. 16px logos in dense rows; 24-32px avatars; 48-50px in two-line rows. Circles for
people, tokens and companies; a 2-3px radius for artwork and flags; 8px for photographs. One fixed media slot down the list, with
a 10-16px gap to the text.

### Actions and paging

- **No pagination on an overview** (0 of 23). Cap the rows and link out, and state the total.
- Row actions: none on 9 screens, otherwise one kebab at the far right.
- Reserve a trailing action column only when most rows carry the action. When a row needs doing, its action is a visible ghost
  button or ink text action in one fixed trailing column, never muted grey text, and never stacked so rows change height.
- Checkboxes only where bulk actions exist.
- **Hover and selected:** a 1px outline at 6px radius, or a darker border with a 1px ring. In a list driving a detail pane, the
  selected row takes the `active` fill (*judgement*).
- **Toolbar:** one search, 30-36px tall.
- **A full list screen** (*judgement*) states the total above the table, keeps the header in view while scrolling, and shows the
  range ("1-50 of 1,284").

## Lists that carry data

- **The row fill is the bar:** a radius 8 row background as wide as its share of the largest share, 44px rows, 2px gaps. Only in a
  one-figure ranking list; in other rows the fill's edge cuts through the words.
- **Bar list:** a 64px pitch, a label line, then a 10px pill bar with the value 5px after its end; the longest bar about 88% of the
  width; one colour, no track.
- **Inline bars are thin and grey** unless they are the screen's main series: 2-3px at most, with the top item in ink.
- **A timeline draws its comparison** as a mark on the same axis, not only a line of text.
- **Legend as table:** dot, name, pill, value and change on a 57px pitch.
- **Key-value well:** a tinted well, radius 8, 32px rows, label left, figure right.
- **Feed as row cards:** 63px tall, 8px gaps, a fill one step lighter and a border one step darker than the panel, a relative date
  on the right.
- **Tree:** no dividers, 8px of indent per level, ink against grey by level, a pitch of about 30px, about 45px between groups.

## Forms

The study holds forms on three screens, so this section rests on little.

- **Label above the field,** 14px at 500, 8-10px gap. No floating labels and no placeholder standing in for a label.
- **Inputs** 38-40px in forms, radius 8-10; toolbar and filter controls 28-40px, median 32. One control height per context.
- Inputs stay white with a 1px border even on a grey panel; filter and select controls take a border one step darker.
- A leading icon at 14px, 13px from the edge, with text starting at 38px.
- **Spacing:** 24px from a description to the first label, 16px between fields, 16px to Save.
- **A joined input and action,** such as a read-only link and Copy, share a border and square their inner corners.
- **Toggles** 28x16 to 33x20. The on colour is a semantic green or near-black, not the brand accent.
- **Disabled** controls stay legible and say why.

### Buttons

Controls run 27-40px tall, median 34. A 6-8px radius in tight styles, full pills in soft ones. One filled primary per screen,
usually near-black. A secondary is white with a 1px border; a tertiary is text. Controls in one row share one height.

## Settings

The study has one settings page, so the basis is thin.

- Each section is a row: a label column of about 450px (16/500 title, 14px grey description) beside a panel of about 700px, level
  with the panel's first line.
- Sections are split by a full-width 1px rule with 32px above and below.
- **A switch row:** a 14/500 title, a status badge 8px after it, a 14px grey description, and the toggle at the right, centred on
  the title line.
- **A plan-gated feature:** a 48px tinted strip with a 32px button directly above the locked panel, which stays readable.
- **Do not leave the label column empty beside a tall panel.** Put help or a summary of current values there, or narrow the column.
- **Destructive actions** (*judgement*) go last in their own section, as a text or outlined button in `negative`, with the
  consequence in words and a confirmation naming the object.
- **One view per area** (*judgement*). General, members, billing and notifications each get their own view, with the area's name
  as the h1. One long page with the sidebar scrolling to anchors failed in testing.
- **One save model per view** (*judgement*): every control saves itself with a quiet "Saved" stamp, or one Save per panel at its
  bottom right, secondary until that panel has changes. Never both.
- **Show what the setting produces** (*judgement*). A small preview beside the control, such as the invite email or the plan's next
  invoice, is the substance settings otherwise lack.
- A settings view opens with a usage strip only when usage is its question.

## Data states

**Zero** means the object exists and its value is 0, such as a balance of £0. **Empty** means there are no records, in the
account or in this window. **Missing** means a value does not exist or does not apply.

- **A real zero** is printed normally: "$0", "0%". It may be dimmed when the caption beside it becomes the next step.
- **Missing or not applicable** is a grey dash at label size. "--" at 24px reads as loading.
- **Counts follow the view.** Tab, tile and "12 open" counts are computed from the rows in view and recomputed on every switch. A
  filtered block shrinks to its rows or keeps a fixed row count with one sentence.
- **An empty section keeps its frame and header** and adds one sentence spanning the block: a 1px dashed box, radius 8, about 38px
  tall and never stretched to fill the card, or a bordered box with an add link. In a row grid use `grid-column: 1 / -1`.
- **An empty side card fills with reference data:** last Sunday's sell-out times under "Nothing has sold out yet today".
- **An empty chart is drawn:** the zero line, missing bars, no padded range, no picture.
- **First run:** keep the frame and title, and put the first action where the data will appear, with setup progress at its true
  percentage if there are steps.
- **Red is a signal, not a texture:** one red mark per object at most, on the overdue or failing fact.
- **Loading** (*judgement*): the final layout with each value replaced by a flat grey bar at its real size, rows keeping their
  pitch, labels and headers shown at once, no shimmer gradient, no layout shift. A refresh keeps old values and updates the
  freshness stamp.
- **Error** (*judgement*): inside the block that failed, never a full-screen banner. One sentence saying what failed and when data
  was last good ("Couldn't load deployments. Last updated 09:14."), plus a Retry text button. `negative` only on a small icon or
  in the pill pair.
- **Stale or static data:** a freshness stamp with a refresh button. A snapshot that cannot refresh says so in one quiet notice,
  using the warning pill pair and `notice-border`. A notice tint is never a ground.
- **Limits and usage:** a bar at the true ratio with both ends labelled ("12.7k of 20.0k").
