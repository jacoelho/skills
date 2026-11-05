# Patterns

Blueprints for a whole screen, grouped by screen type. Take one as a starting structure, then change it to fit the
product: when the product is of the same kind as a blueprint's source, copying the arrangement is the trap, and judges
in testing recognised copies at once. Take the structure from the product's own things instead, such as a couple's
budget as three columns for each partner and the joint account.

Sizes are measurements from the source screens. Pictures named here are slots for the product's own data and stay out if
the product has none.

## Overview

### KPI strip, main chart and a side rail (`kpi-strip-chart-rail`)

Kinds: creator, smb-admin, community, analytics. Evidence: a newsletter home; a community overview.

Title row: a 24px noun or the product's name at 600-700, an optional 14-16px grey line under it, and the one primary action on the right, bottom-aligned with that line. 16-24px below, the scope row: section tabs and the date range in one row of 32-36px controls, or a 48px segmented track with the range select inside its right end. Then a grid of 1fr and a fixed 384px rail with a 24px gap. Main column: one KPI container split by 1px dividers into 3-5 equal cells (14px grey label, 24px value at 400-600, a 12px caption naming the baseline and window), then the main chart card, which is the largest thing on the screen, then the next card, all 16px apart. Rail: 16px headings outside their cards, 8px above each and 16px after the previous card; a recent-items list of 3-5 rows on a 45px pitch with 1px rules, closed by a 30px outlined 'View all' button instead of pagination. The rail starts level with the first card, not with the title.

**Phone.** The rail moves below the main column; the KPI container becomes a 2-column grid; tabs scroll inside their own row.

### KPIs as the chart's tabs (`kpi-tabs-chart`)

Kinds: finance, commerce. Evidence: a seller home.

One card per subject, 8-16px apart: the main chart card runs full width, and any card holding a table of five columns or fewer, or a short list, pairs with its neighbour in two columns, the page header indented by the card padding so the title, the card titles, the numbers and the plot share one left edge. Balances that do not change during the day go first, in one container split by 1px dividers into equal columns; a zero balance is grey and its caption becomes the next step. In the main card, 2-4 KPIs sit in a row and act as the chart's series tabs: the selected one carries a 2px rule and an ink label, the others keep a grey label and their value in ink at a lighter weight (a grey value reads as disabled); when the tabs are the per-entity breakdown the brief asks for (takings by shop), nothing is greyed and the rule alone marks the selection. Choosing one swaps the series. Under them, one line chart as wide as the card's content (about 1136x220 in the study): 3-4 solid 1px gridlines, 4-6 round y ticks at 12px, a 2-3px `chart-1` line with straight segments and no fill, an 8px hover dot with a 1px solid hairline guide and the line after the cursor in pale grey. Close with a 2-3 row comparison table on a 36px pitch, value and change columns right-aligned under a 14px grey header such as 'vs prior Monday'.

**Phone.** KPI tabs become a 2-up grid above the chart, with the selected cell marked by a fill (never an underline floating inside the grid) or a row of tabs that scrolls sideways; the chart is full width, 160-200px tall, with 4 x labels; the comparison table keeps its two right-aligned columns.

### Finance home with a pinned accounts column (`finance-home-pinned-rail`)

Kinds: finance, wallet. Evidence: a personal finance home.

No page header and no KPI strip: cards start 36px from the top and each headline sum sits in the card that explains it. On the left, a 306px accounts card pinned at the viewport height minus the 36px margins opens with net worth (16/600 label left, value right) and holds the account tree with no dividers: groups 16px ink, categories 14px ink, leaves 14px grey indented 8px, values right-aligned, a 30px pitch and about 45px between groups; an empty group is a bordered box with an '+ Add account' link instead of $0.00. On the right, a 2-column grid with 24px gaps of cards that answer this month's questions, each with its own period caption: the plan (spanning both columns; a plan-against-actual track, the available figure beside it with a per-day line), recent spending as 61px two-line rows (payee over category, amount over date, right-aligned) and upcoming bills. Income is green with a plus sign; spending stays in ink.

**Phone.** Net worth becomes the first card; the account tree collapses to its groups with totals; the month cards stack.

### Platform overview with a usage tray (`platform-overview-tray`)

Kinds: devtools, analytics. Evidence: a developer platform project overview.

Sections stacked in one column about 48px apart, each with an 18/500 title on the left and a quiet action on the right ('View all', an outlined Refresh, a date-range button), and freshness in 14px grey after the title with a small status dot. First, a getting-started strip: one container split by 1px dividers into 4 equal cells (16/500 title, a 14px description, a grey arrow top right), shown until setup is done. Then the recent items table, capped at 4-5 rows on a 49px pitch: IDs in mono truncated to 8 characters plus an ellipsis with a copy icon, relative expiry in grey, rules that bleed 8px past the text column. Then usage: a #fafafa tray with 6px padding holding a KPI strip of 5 equal cells (a 14/500 label over a 24/400 value with a 14px unit suffix, '5 mins') and, 6px below, a chart card whose metric is chosen by the KPI cells themselves (the selected cell marked by a 2px rule or the active fill), never a second control repeating the KPI labels; the chart takes two-thirds of the width when its line is flat for most of the window, with the next answer beside it. Durations and timestamps in tabular figures. A missing value is a grey dash at label size, not '--' at value size.

**Phone.** The getting-started strip becomes a 2 x 2 grid or a list; the table becomes two-line rows; the KPI strip a 2-column grid.

### Current deploy and health lead (`deploy-health-lead`)

Kinds: devtools. Evidence: judgement, from testing: built after a flat 24-hour chart filled a whole first screen and lost to a richer layout.

Title row: the project's name as the h1 with a status pill (Healthy, Degraded) and a breadcrumb of team and product above it; repository, branch and a freshness stamp in a 14px grey line under it; the one primary action (Redeploy, or View logs when the latest deploy failed) on the right. Then a full-width card for what is live now: the production deployment's commit message at 16/600, its branch, short SHA in mono, author and age on the left, and three or four facts in divided cells on the right (domain, live since, build time, regions). Then the health strip: three or four KPIs in one divided container, each with its change in words and in the polarity colour when it moved the wrong way. Then a two-column row: the 24-hour chart at two-thirds (deploy markers as 1px ticks with their short SHA, the budget or SLO as a dashed reference line) and, at one-third, the block that explains the worst number (the spike and what reverted it, the status codes behind the error rate). Then the deployments table capped at 6 rows, a failed row carrying its failing step and a View logs action, a building row its elapsed time.

**Phone.** The live deployment card becomes a stack of label-value rows; the KPIs a 2x2 grid; the chart full width with its markers; the explanation under it; deployments as two-line rows with region and duration on line 2.

## Analytics

### Per-period and running-total pairs (`chart-pairs`)

Kinds: community, smb-admin, analytics. Evidence: a network analytics overview.

Title at 24-32px with one sentence under it saying what the filters do, then one filter row of 36-38px controls (one filled or near-black, the rest borderless or text, a reset link last) and 16-24px to the KPIs. KPI row: 3 equal cards in the content column (3 x 372 + 2 x 18 = 1152) or one divided container; a 16px label over the value with the change written as a phrase on the value's baseline ('+8 in the last 90 days'), grey when it is zero. Then one row per metric: the per-period column chart on the left and its cumulative line on the right, at equal width (2 x 567 + 18 = 1152) and with the same x ticks; a 2px straight line, integer ticks from zero, no legend because each chart has one series. One gap value horizontally and vertically.

**Phone.** Pairs stack, the cumulative chart directly under its per-period chart; KPI cards become a single column of label-value rows.

### Insights with share tables (`insights-share-tables`)

Kinds: analytics, devtools, builder. Evidence: a per-agent insights page.

No cards: sections are carried by whitespace and a 16/500 heading with one 14px grey sentence under it saying what the section shows. A row of up to 6 KPIs on a fixed pitch (12px grey label over a 30px tabular value, no boxes, no dividers), then one full-width time chart (about 218px plot, 5 hairline gridlines, 11-12px grey ticks, a dot legend under the title, a 'Compare to previous period' text button on the right). Then a 2 x 2 grid of small tables with a 24px gutter whose rows align across the two columns. Each table: a header of 12px grey labels with no fill and no rule, 44px rows with 2px gaps whose rounded fill (#f5f7f9, radius 8) is the data bar, its width the row's share divided by the largest share; Share in 12px grey and Count in 14px ink, both right-aligned. An empty table keeps its header and shows one dashed 1px box about 38px tall with one sentence ('No Slack channel usage in this range.').

**Phone.** KPIs become a 2 x 3 grid; the chart is full width; the share tables stack in one column and keep their row bars.

### Report card with a legend table (`report-card-legend-table`)

Kinds: analytics, smb-admin. Evidence: a campaign overview.

A report card (20/600 title, a kebab top right, a 32px select for the scope) whose body splits into a 390px left block and the chart. Left: the hero number at 24/400 with its label under it and one change pill with its window ('vs. previous period'), then the legend as a mini table of 2-4 metric rows on a 57px pitch: dot, name at 15/600, a benchmark pill, the value right-aligned, the change right-aligned. Right: the line chart with 4 gridlines at round values, a 2px baseline with ticks, y labels on the right and axis text no larger than the data (12-14px; 16px ticks were flagged as louder than the numbers). Under it, a detail table whose rate cells stack the count over a 12px grey percentage on one right edge. Use the same colour for a series in the legend dot and in the line.

**Phone.** The legend table goes above the chart; the detail table becomes two-line rows.

### Research lists and a long table (`research-lists-table`)

Kinds: markets, devtools. Evidence: a stock research view.

Header: a 26/700 title over a 20px grey date, quiet pill buttons on the right; a 1px rule about 44px below, with the tabs just under it and the active tab marked by a 1px accent line as wide as its label lying on that rule. 64px below, a 2-column row of cards at about 43/57 with a 24px gap: a ranked list on a 28px pitch (a 16px logo if the data has one, bold ticker, grey name truncated, a right-aligned grey percentage and a white value, signs in the text) and a chart card with its legend in the header (5px dots, 13px grey labels), a text range selector under the baseline (1M 3M 6M YTD All, the active one marked by the same 1px accent segment) and 'Updated daily' in 11-12px grey. Then a 20/400 grey section title and a full-width table: a 38px header of 11-12px grey labels, 42px rows over 1px rules, ISO dates and every figure right-aligned in tabular numerals, white only for the identity and the total. Give the chart a y-scale and dates (the studied chart had neither and was flagged).

**Phone.** Cards stack; the range selector stays as text under the chart; the table becomes two-line rows with the total on the right.

### Bar list and ranking (`bar-list-ranking`)

Kinds: analytics, smb-admin. Evidence: an AI-search visibility overview.

A 24/700 title with one factual stat chip beside the actions on the right; underline tabs on a 1px rule; a filter row of compound outlined groups that read as a sentence ('Date | Jun 14 - Jul 13 | Daily', 'Region | United States'), 28px tall and 8px apart. KPIs: as many equal columns as there are KPIs (four across, not four in a three-column grid that orphans one), tabular or mono values with fixed decimals. Then two equal panels, each with a 73px header (14/600 title, a 13px grey description, a dropdown that switches the panel's metric) over a full-bleed 1px rule: a sorted bar list (rows on a 64px pitch, a label line, then a 10px pill bar in one colour with no track, the value 5px after the bar's end, the longest bar about 88% of the width) and a ranking table (53px rows, rules inset to the padding, a rank, a 16px logo if the data has one, a soft chip on the user's own row, values right-aligned). Do not fix a panel's height so its last row is cut off (flagged).

**Phone.** KPIs in a 2 x 2 grid; panels stack; the bar list keeps its bars at full width.

## Lists

### Table with tabs and a filter bar (`table-filter-bar`)

Kinds: community, devtools, commerce, support, smb-admin. Evidence: an events back office, a tracks studio, a sessions overview.

Title row: an 18-24px title on the left, at most an outlined secondary and the one primary (36px) on the right. Underline tabs for the list's states on a full-width 1px rule with a 2px indicator as wide as the label; 22-32px below, the toolbar: a search of about 252-316 x 32-36 on the left, the count ('7 events') and the sort on the right. The table sits on the panel or page ground with no card around it: a header of 12-13px grey sentence-case labels with no fill and no rule, rows on a 48-56px pitch for one line or 72-92px with a thumbnail if the product has one (media height plus 24-32px), 1px rules 3-7% darker than the ground or no rules at all, the identity column given the most width, numbers right-aligned in tabular figures with the unit muted ('5 /10'), one status mark per row and one kebab at the far right. Drop a column that is empty in every row (a blank co-host column left a 300px dead band). On an overview, cap the rows and link to the full list; on the full list, state the total and load more at the end.

**Phone.** Rows become two-line items: identity and the key number on line 1, the secondary fields in 13px grey on line 2, the kebab at the right. Tabs scroll in their own row; the search becomes a full-width field.

### Count cards that filter (`count-cards-filter`)

Kinds: community, commerce, support. Evidence: an events back office.

Above a list, 3-5 equal count cards (61px tall, 12px padding, a 13px grey label over a 16/600 value, 8px gap) are the type filter: the selected card gets a 1.5px accent border and a pale accent fill, and the list below shows that type only. Zero counts print as '0' in the same style; no deltas, no icons. This is one place where a row of identical small cards is right: the cards are peers and each one does work.

**Phone.** The count cards become a horizontally scrolling row of chips with the count inside each, or a select above the list.

## Object detail

### Object header and a six-column grid (`object-detail-header-grid`)

Kinds: community, commerce, analytics. Evidence: an event's analytics tab.

The page header is the object itself: one card (88px, 14px padding) holding a 50x62 cover if the object has one, the 18/600 name with 28px icon buttons beside it (open, copy, share), a 13px grey meta line (date, time, place) and outlined 36px actions on the right. Under it, underline tabs on a full-width 1px rule, then a 36px row with a segmented time range on the left and a refresh button on the right. The body is one 6-column grid with one gutter (14px) in both directions whose spans change by row while every edge lands on the same lines: 3 KPI tiles of 2 columns, the main chart in 4 columns beside a side chart in 2, two progress cards of 3, a full-width trend of 6. Give the widest card to the screen's question, and do not give 824px to one ring and one legend row (flagged).

**Phone.** The header card keeps cover, name and meta, with actions in a kebab; every grid item takes the full width in the same order.

### Tabbed object detail in a sheet (`tabbed-object-detail`)

Kinds: analytics, smb-admin, builder, support. Evidence: a list's engagement tab; a reports dashboard.

Inside the sheet: a breadcrumb row at 16/600 (the parent in grey, the current page as the h1, a 24px grey type chip after it) with its actions on the right (a text button and an outlined 32px dropdown). Under it, the object's tabs at 14px with a 2px ink underline that runs 8px past the label, on a 1px rule that spans the sheet. 30px below, the filter row: a label above a 300x32 select on the left; the freshness stamp ('Last updated July 21, 2026') and a 40px refresh button on the right, centred on the select's line. Then 3 KPI cards (value 36/400, its label at 16/600 under it, the period in words) and 2 chart cards, all on one 24px gutter so the rows share column lines. Do not stretch a short card to its neighbour's height (it left 250px of dead white) and do not list legend series that have no data.

**Phone.** Breadcrumb shortens to a back link and the h1; tabs scroll; KPI cards stack as label-value rows; charts full width.

## Settings

### Settings in two columns (`settings-two-column`)

Kinds: all kinds. Evidence: one settings page; stacking from a narrow rail card. The basis is thin..

A centred column of about 1152px. Each section is one row: a label column of about 450px (16/500 title, 14px grey description; the title's cap top 6-8px below the panel top, level with the panel's first line) beside a panel of about 700px with a #fafafa fill, 16px radius, 16px padding, no border and no shadow. Sections are split by a full-width 1px rule with 32px above and below. Inside a panel: field labels 14/500 above 40px white inputs (1px #e8e8e8, radius 10), 8px from label to field, 16px between fields, 24px from the description to the first label, 16px to the Save button; switch rows with a 14/500 title, a 20px status badge 8px after it, a 14px grey description and a 28x16 toggle 16px from the right edge, centred on the title line. A plan-gated feature shows a 48px tinted strip with a 32px button directly above its panel, and the panel stays readable. When a panel runs much taller than its label, put the section's help or a summary of the current values in the label column rather than 250px of nothing.

**Phone.** Each section stacks: title and description, then the panel at full width. Inside, label, 8-10px, field, 16-26px to the next pair; toggles stay on the right of their title.

### Settings with usage on top (`settings-with-usage`)

Kinds: devtools, smb-admin, support. Evidence: one settings page.

Use this only when usage is the question of the view (a plan, billing or quota view), and show only numbers no section below repeats, at a size below the h1. When a settings screen also reports usage, put 3-4 usage numbers in one row on top (a 14px grey label, a 30px regular value, a 12px change pinned to the card bottom with its window in words, a grey dash where there is no comparison) and link out to the analytics screen ('View more') instead of drawing a chart. Below, the two-column settings rows. One dark primary per screen. Keep upsell to one surface: the studied settings page carried three nags (a top banner, a setup button and a gated strip) and was flagged for it.

**Phone.** The usage row becomes a 2-column grid of label-value pairs; settings rows stack.

## Wallet

### Balance, actions and assets (`wallet-balance-actions-assets`)

Kinds: wallet, finance. Evidence: a wallet home.

One column whose every element snaps to its two edges. A balance card (1px border, 16px radius, about 134px tall) holding one 32px figure and one line under it in which only the change is coloured ('-$0.09 in the last 30 days'); the title says what the figure is, so it needs no label. 32px below, 4 equal action tiles in a pale tint with dark same-hue icon and 12-14px label (4 x 144 + 3 x 16 = 624 in the study; scale the column and keep the arithmetic). 32-40px below, text tabs for the asset kinds on a 1px rule with a 2px ink indicator as wide as the word, a network or account select on the right of the same row. Then the asset table: 72px rows (a 48px round asset mark, if the product has one, plus 24px), no dividers, two-line cells pairing a 16px value with a 14px grey unit amount, numeric columns right-aligned to shared edges, change as a small solid triangle and a coloured percentage, zero change grey, a missing share a grey em dash. On a desktop do not leave the column at phone width: the study's 624px column was flagged as a stretched phone screen; widen it to 864-1100 or give it a second column.

**Phone.** This pattern is phone-first: the same column at full width with 16px margins, the 4 tiles in one row, the table as two-line rows with the value right-aligned.

## Builder

### Builder canvas (`builder-canvas`)

Kinds: builder. Evidence: a flow builder in analytics mode.

No global navigation: a 44px top bar on the window ground with no rule (an exit arrow, the object's name at 16/600 with a status pill, and on the right 16px icon buttons on a 40px pitch, a secondary and a near-black primary, split by 1px dividers). Below, two panels on the ground with 8px outer margins and a 12px gap, both with a 1px border, 16px radius and no shadow: a 232px palette (16px padding, groups under 14px labels, items on a 40px pitch with a small type tile, a label and a drag grip) and the canvas, a flat well one step darker than the ground (#f4f6f8 on #f9fbfc) with no dot grid. Nodes share one width (338px in the study), 12px radius, a 1px hairline, padding 16 on top and 12 at the sides, a type tile and a 16/600 title, and their metrics in a well as key-value rows on a 32px pitch with right-aligned tabular or mono values ('0% (0)'). Nodes stack on one spine 64px apart with a 38px round insert button centred in each gap; connectors are 1px orthogonal lines with 6px rounded elbows. Overlays (date range, zoom, minimap) are small white controls pinned 16px inside the canvas corners. Canvas content is one size larger than the chrome (16 against 14). Node-type tiles may be tinted, one pastel per type, the same in the palette and on the canvas: say why in the report.

**Phone.** Editing a graph on a phone is rarely the job: show the flow read-only as a vertical list of nodes with their metrics, and the palette as a bottom sheet if editing is kept.

## Inbox

### Inbox triage (`inbox-triage`)

Kinds: support, workspace. Evidence: assembled from the study's list, feed and rail measurements; no inbox screen was in the study.

Three regions on one ground: the navigation (a 230px sidebar or a 55px rail), the list, and the open item with its details. The list column has a fixed width (the study's fixed columns are 306 and 384px) and its own toolbar: saved views as underline tabs or a select, a 32px search, the count. Rows are two-line, 64-80px: line 1 is who (14/600) with the time in words right-aligned in grey ('9 min', 'Yesterday'); line 2 is the subject or last message in 13-14px grey, truncated to one line with an ellipsis. Unread rows set the name at 600 and add a 6px dot or a 16px count circle; read rows keep the name and subject in ink at 400 (grey is for meta only, never for a row's identity: faded urgent rows were the top complaint in testing). One status mark per row (priority or SLA, as a pale pill or words, not both). The selected row takes the `active` fill of the nav pill (optionally a 2px accent bar inside its left edge), so it is never confused with a hover or a focus ring; never a saturated fill. The row's meta sits in fixed right-aligned slots (assignee 20px, channel 14px, priority 14px) so it lines up as columns; priority is printed only above normal. The open item fills the remaining width; its details (customer, plan, history) sit in a fixed column of 306-384px as key-value rows on a 28-32px pitch.

**Phone.** One region at a time: the list fills the screen; choosing a row pushes the conversation; the details open from a button in its header; back returns to the list at the same scroll position.

## Home

### Workspace home with a greeting (`workspace-home-greeting`)

Kinds: workspace, creator. Evidence: a team workspace home; a personal insights home.

A centred column on a real 12-column grid (77px columns, 16px gutters, 1100px), about 72px from the top. The greeting is the h1 (48/700 in a serif, or 24/400 in the sans), with the date after it or in a grey line under it, never as a tracked eyebrow, and no emoji. 50px below, 4 count tiles spanning 3 columns each (128px tall, 16px padding): label, value at regular weight in tabular or mono figures, a plain caption ('Ready when you are'), no deltas. Then spans that change by row but share column lines (9 + 3, then 6 + 6, so each internal edge meets one above it) for the main objects: panels with 20px padding, a 14/600 title, a count chip and a 'View all' link, holding row cards 63px tall with 8px gaps, one step lighter than the panel with a border one step darker. Pale tints may code the panels, each in the hue of the tile that counts it. Only a floating composer, if there is one, carries a shadow, and it must not cover the last rows.

**Phone.** Greeting at 24-28px; tiles in a 2 x 2 grid; panels stack in reading order.

## Report

### Generated report (`generated-report`)

Kinds: report, analytics. Evidence: a report generated from a CSV.

No sidebar; the only chrome is a 47-48px viewer bar with a 1px rule. A centred 1088px column 33px below it: a 24/600 title, a 12px grey line 4px under it naming the source and the load time, one outlined 30px action on the right ('Refresh view'). If the data is a snapshot, one quiet notice (#fffbeb fill, 1px #fde68a, 12px #92400e text, 34px tall). Then 4 stat cards with a 12px gap (4 x 263 + 3 x 12 = 1088), a 12px grey label over an 18/600 tabular value; put the date range in the subtitle, not in a lone fifth card. Two charts side by side at the same 12px gap so their edges meet the stat columns: a time chart on a real time axis with flat labels, and a histogram with equal bins and square bottoms. Then the records table in a card: a 256x30 search in its header, a 14/600 grey header row over a 1px #e5e7eb rule, 37px rows over lighter #f3f4f6 rules, numbers right-aligned, a sort glyph on the active column only.

**Phone.** Stats in a 2 x 2 grid; charts stacked; the table as two-line rows, or scrolling inside its own frame with the first column fixed.

## Signature elements

These belong to specific products. Use one only when the product really has that thing. Their value is showing how an
element is built from a product's own objects, so otherwise invent your own the same way.

### Power flow summary (`power-flow`)

Evidence: judgement, from testing: a home-energy overview without it read as the stock dark dashboard; real energy apps lead with this flow.

A strip under the title row that answers "where is the power going now?": four nodes in one row (Sun, House, Battery, Grid), each a 14px label over its live figure at 20-24px with the unit as a grey suffix (2.4 kW), the battery's charge under its figure (88%). Between neighbours, a 2px connector only where power flows now, with its direction and amount in words above it ("to battery 1.7 kW"); an idle link is a 1px solid rule in the grid colour. Solar and export carry the one data hue, import from the grid is grey, the house is ink. The flows balance and are built from one live-state object that also feeds the top bar and the charts: sun + grid import + battery out = house + battery in + export. A freshness stamp at the strip's right ("Live · 20:34").

**Phone.** The four nodes become a 2x2 grid in the same order (Sun, House / Battery, Grid) with the flow sentence under it ("Sun 2.4 kW: house 0.7, battery 1.7"), no connectors.

### Team timeline with kind encoding (`leave-timeline`)

Evidence: judgement, from testing: a leave calendar that drew every booking in the same pale grey read as a loading state.

People down the left on a 160-220px column, grouped under 12px team subheaders; days across with weekends one tone step darker, faint 1px day lines, and today as a 1px line in the one data hue with its date in ink in the header. Each kind of booking has its own mark: holiday a pale fill, off sick a 1px diagonal hatch, long leave a darker grey step, working away an outline, a pending request a dashed outline. Full colour only for what needs a decision: a request that breaks cover is outlined and labelled in the negative colour. Bars 20-24px tall at radius 4; the label inside the bar, the kind's code when the bar is too short, then the label after the bar's end, never over the days before it. One-line names on a 32px pitch; a name with a subline (team, office) on 40-44px. A public holiday is a small dot under its date whose tooltip names the office. Each legend swatch is its mark scaled down, and only kinds on screen are listed.

**Phone.** One week at a time, with the week switch in the same control row as any office filter; names shorten to first name and initial; the legend sits in a 2-column grid.

### Cover against the minimum (`cover-matrix`)

Evidence: judgement, from testing: a grid of 120 absolute headcounts made the reader subtract each team's minimum in their head.

A team-by-day matrix of slack against each team's minimum (+2, +1, 0, −1) rather than headcounts: the team and its rule ("needs 7 of 10") in a 160-220px label column on a 40-44px pitch, one cell per working day with the signed slack in 12px tabular figures. Cells with room to spare stay plain; one hue ramps toward the negative colour as the slack runs out (tight a pale tint, at the minimum a stronger tint, short the full negative with white figures), and the headcount sits in the tooltip ("6 in of 9, needs 7"). Today's column has its date in ink. The days that go short are the finding in the title row, beside the request that causes them.

**Phone.** The lowest slack per team for each week (four columns), with the days behind a tap; or one team at a time.

### Sell-out time strip (`sell-out-strip`)

Evidence: judgement, from testing: six 4px black bars for sell-out times were the loudest marks on a bakery screen and drew no comparison.

One row per line that sold out, earliest first: the line and its shop on the left; a 2px grey track on a shared opening-to-closing axis with an ink dot at today's sell-out time and a hollow tick at the comparison day's (last Sunday); the time on the right in ink with the gap under it in 12px grey, its baseline named ("3 h 40 m before close", "45 m earlier than last Sunday"). The lines that did not sell out are counted in one closing sentence, not drawn. Axis labels on one hourly step from opening; the legend (Today, Last Sunday) shows the marks themselves.

**Phone.** The rows keep the full width with axis labels every two hours; the gap moves under the line's name.
