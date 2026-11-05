---
name: app-screen-design
description: Design and build application screens that people work in, such as dashboards, admin and back office, analytics, reports, settings, billing, inboxes, queues, list and table screens, wallets, builders and object detail pages. Use when creating or restyling any of these, in any stack, or when reviewing whether one reads as a generated template. Not for landing pages or marketing sites (use frontend-design). General chart construction stays with dataviz; KPI rows, dashboard layout and chart hue on app screens follow this skill.
---

# App screen design

An app screen is worked in, not read once. A generated dashboard is the average of every dashboard template: nothing in
it is wrong and none of it was decided. Removing the template's devices is half the job. The other half is substance:
the product's real data, a screen that answers its one question first, and a grid whose sums close.

The guidance comes from a study of 23 desktop product screens plus testing with judges. Counts of screens are
measurements; sizes and ranges are measured or tested. A rule with no count, or marked *judgement*, comes from testing
or judgement. Treat all of it as defaults
with reasons, and break one when the product gives you a better reason.

This skill ships specifications only. Build in the project's own stack and components.

## Boundaries with other skills

- **`frontend-design`** owns landing pages and marketing sites. On app screens, this skill's defaults win where they
  differ. A product page showing interface fragments follows `frontend-design` for the page and this skill for the
  insides of the fragments.
- **`dataviz`** owns chart construction: form choice, marks, axes, hover, legends, palette validation and accessibility.
  Use it for every chart. This skill owns KPI rows, dashboard layout, the chart hue (`chart-1` of the style), and the
  app-specific forms in [components.md](references/components.md). A dark theme is needed only when the chosen style is
  dark or the brief asks for one. For a dark version of a light style, use the dark default tokens, keep the style's move,
  and re-derive `accent`, `chart-1` to `chart-3` and every tint and accent pill for the dark surface.

Where `dataviz` and this skill disagree, this column wins on app screens:

| Topic | `dataviz` | On app screens |
| --- | --- | --- |
| Stat tile | optional sparkline; semibold value | No sparkline on a KPI (0 of 23 screens); value weight from the style |
| Lead figure | hero at 48px or more | Answer figure at 30-36px; nothing at 48px, which reads as a landing page |
| Figures | proportional when standalone; compact (12.9K) in tiles | Tabular on any KPI or updating value; full figures with separators |
| Dashed lines | never in grids | Gridlines stay solid, as in `dataviz`. Dashed lines are for reference lines, forecasts, pending outlines and empty slots |
| Filters | one row above the charts, never in a chart card | Screen-wide scope stays in that row. A control changing one card alone sits in that card's header |
| Bars | at most 24px thick | The row-fill list in [components.md](references/components.md) is a list row, not a chart bar |
| Status hues | never a series colour | Allowed when the series is itself polarity, such as gain and loss |

## Procedure

Do these in order. The first four decide whether the screen is any good. Keep the results of steps 1 to 4 as short notes.

### 1. Inventory

- **Objects:** what the screen shows, their fields and units.
- **Magnitudes:** how many objects, a typical amount, the range of a rate, how values move over a day and a year, and
  how small they really are for a new account.
- **People:** who opens this, how often, on what device.
- **Jobs:** what they do next from here, and which job comes up most.
- **The product's own things:** its name and mark, the scope (workspace, team, account), the people in it, and the
  objects they recognise. Plan where each appears.

Then write a small dataset the screen renders from. Use believable names and a unit on every figure. Small numbers stay
small. No lorem ipsum, Acme, John Doe or "User 1", and no vanity figures or growth on a week-old account.

### 2. One question

Write the screen's one question in a line, such as "Which deploy broke?". It decides three things:

- **What is biggest.** The largest block carries the question, and the largest figure answers the title row's sentence.
- **What comes first** in reading order.
- **What is left out.** A few numbers often need no chart.

Name the **one finding**: the fact in today's data that most needs attention, such as "the 23:28 deploy doubled the
error rate". Put it where it is read first, next to the action it drives.

List the blocks as answers to the screen's next questions. Delete any block with no question. This avoids the stock
order of KPI row, big chart, two small charts, table.

Three tests apply here:

- **Everything the brief names is on the first screen.** At 1440×900, each named block shows its header and first rows
  or its figure. Size the headline block to the question, about 200-360px tall. Cap lists at 4-6 rows with "View all", unless the
  whole list fits on the first screen, as a day's movements may.
  Time-sensitive blocks go before long tables.
- **The most frequent job is one click away.** Name it, and put its control where the answer shows. A screen with no
  control for its main job reads as a report.
- **Evidence sits beside the answer.** One line explaining the event that matters is worth more than a second chart.

### 3. Choose a style

Choose from [styles.md](references/styles.md) by how the product is used, and write one line on why. Keep the style's one
move; take every other value from the style or the [foundation](references/foundation.md). Patterns describe one source screen: where a pattern's size, colour or weight differs from the
style, the style wins.

An existing design system or brand wins: map its values onto the token roles and keep the style's colour budget and move.

### 4. Give the product a face

Correct tokens produce a well-applied kit, which judges called the top failure after four rounds. Before any markup,
choose:

- **One face option** from the style's list, visible on the first screenshot.
- **The product's mark and name** at the top of the shell, drawn for this product as a simple monogram or symbol, never a
  black square with a letter.
- **One element only this product has**, built from its own things: a marina's berth map, a bakery's sell-out strip, a
  deploy's commit as the lead of the overview. See the signature elements in
  [patterns.md](references/patterns.md) for how; invent your own unless one truly fits.
- **The style's typeface, really loaded.** A fallback to the default face lands on the default look.
- **Words of the trade** in labels and empty states ("Waiting on the customer", "Due on the 28th"), never "Items",
  "Records" or "Status".
- **People and objects as themselves.** Each person gets a stable initial and a pale tint of their own hue, as far from the
  next person's as the team's size allows, or a neutral tint where the style allows no other hue; these tints are identity, not data, and stay out of chart legends. Pictures appear only
  when they are the product's own data, such as avatars, thumbnails and cover art. There is no decorative imagery.

Two products on one style must not share a face.

### 5. Build

Build the empty shell first: nav, top bar if any, canvas, title row ([layout.md](references/layout.md)). View it at 1440
and 390. Write the grid arithmetic in a comment: column count, gutter, and the sum proving cards land on the canvas
edges. Then add blocks from [patterns.md](references/patterns.md) and [components.md](references/components.md).

Motion is feedback only: press, hover, focus, a menu opening, a row arriving. Nothing on the screen performs an entrance.

### 6. Data that tells the truth

*Judgement, and judges checked every one of these.*

- **Totals are computed from rows**, never typed. Write the figures that must agree as assertions in the data file.
- **Totals and changes use the parts as shown.** Sum the rounded values on screen; a change is the difference of the two
  displayed values.
- **A fact shown twice is one variable**, and copy and annotations are built from it.
- **Every relative figure names its baseline** in the same phrase: "45 m earlier than last Sunday", never a bare "+5".
- **One name per time.** The same moment uses the same words everywhere.
- **If a caption must explain which bars are which, encode it in the chart instead.**

### 7. States

Build and view every state ([components.md](references/components.md)):

- **Each block:** empty, zero, loading, error.
- **Each row and control:** hover, selected, focus, disabled.

### 8. Check

Screenshot at 1440×900, 768 and 390px wide, and judge the pictures: a problem visible there is real, whatever the code says.
With no browser available, say in the report that this visual check did not run.
Answer these in writing:

1. Does the biggest thing answer the screen's question, is it read first, and is the largest figure the one answering the
   title row's sentence?
2. Does every block share the screen's edges? Look for a dead strip, a card stopping short, an orphan cell, or a stretched
   card with a blank band.
3. Is colour only on data, status, including count badges, the one primary action, person tints, and what the style's move
   assigns? Does
   the main data carry `chart-1`? Does the face show on
   the first screen?
4. Do the numbers add up and line up digit for digit? Recompute totals and changes from displayed values, check every
   fact shown twice, and confirm each relative figure names its baseline.
5. Does every zero look like a zero and every missing value like a dash? Does every count badge sit on a queue that needs
   action, with its noun clear?
6. Does every legend swatch match its mark? Does any label collide with a line or another label?
7. On the phone, is the nav folded away, and does each block still answer its question?
8. Does every block the brief names show on the first screen, with the most frequent job one click away?

Then check against [tells.md](references/tells.md). Fix the worst three and look again, three rounds at most.

### 9. Report

Tell the user, briefly: the style and why; the face and the signature element; each screen's one question; rules you
deliberately broke and why; and the sample data to replace, listed so it can be found.

## Limits of the evidence

The study has 23 desktop screens, with no phone screens, no loading or error states, one settings page, no inbox and no
dense operations table. Those areas are judgement. Scores came from judges, so treat them as signals, not proof.
