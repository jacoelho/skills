# Layout

Shells, canvas, title row, tabs and filters, density and the phone.

## Shells

| Shell | In the study | What it is |
| --- | --- | --- |
| `open-plane` | 5 screens | A labelled sidebar on the page ground with nothing or one hairline between them; no top bar |
| `framed-sheet` | 8 screens | Sidebar and top bar share one tinted ground; the page sits on a white sheet |
| `ruled-t-frame` | 4 screens, 3 dark | Sidebar and 64px top bar on one ground, divided only by 1px rules |
| `icon-rail` | 3 screens | An unlabelled 50-60px rail, saving about 180px of width |
| `no-sidebar` | 3 screens | A 46-48px top bar over a centred column, for reports, viewers and few destinations |

All six dark screens use one ground everywhere, divided by 1px rules of #161616-#232323 or by nothing. No screen puts a dark
or saturated sidebar against a light canvas (0 of 17).

### Open plane

Cards sit straight on the ground, the header about 32-36px from the top. The sidebar is 230-256px wide. The switcher sits at
the top of the sidebar, primary nav on a 34px pitch, utilities and the user row at the bottom. The canvas is fluid with one
gutter of 24-64px, or a centred 1100px column for personal homes.

**Phone.** The sidebar folds into a 48px top bar with the screen's name, a menu button opening a full-screen sheet, and at
most one action. Content is full width with 16px margins.

### Tinted frame, white sheet

The frame is #f6f6f6-#f9fbfc, forming an L with no rule inside it. The sidebar is 220-263px. The 48px top bar holds a search
of 548x32 centred on the window with a shortcut hint, plus the account. Three variants:

1. The sheet butts against the sidebar and top bar, inset 8px from the window's right and bottom edges, radius 16, 1px
   #eaeaea-#ededed edge, no shadow.
2. A flush L-frame with no inset, marked by one rule.
3. Sidebar and content as two floating panels inset 8-12px from every edge with a 12px gap, radius 10.

Content has 24px padding inside the sheet.

**Phone.** The frame disappears and the sheet becomes the screen, with a 48px top bar on the frame tint. Search moves into
the menu or behind an icon.

### Ruled T-frame

The sidebar is 210-240px; the top bar is 64px with a 1px rule. The switcher sits at the top bar's right end behind a
full-height divider. Nav pitch is 34 on dark, 40 on light. Content gutter is about 29px. The top bar must carry something
real: two screens left about 1070px of it blank and were flagged.

**Phone.** The top bar stays at 48-56px with the switcher reduced to its mark. The sidebar becomes a menu sheet or a bottom
bar of four or five destinations.

### Icon rail

The brand mark sits at the top, 15-18px outline icons on a 34-49px pitch, groups split by 20px hairlines, utilities at the
bottom. The active item is marked by icon colour, a 2% tint band, or a 1px accent bar. Suits products with few destinations
and screens that need the width. Every icon needs a tooltip and an accessible name.

**Phone.** The rail becomes a bottom bar with the same icons, each with a short label.

### No sidebar

A top bar on the page ground over a centred 1088-1208px column. The logo sits on the column's left edge and the right
cluster ends near its right edge. Three to five 14-15px text links, a 36px search, the account. A sticky bar needs a 1px rule
when content scrolls under it.

**Phone.** The bar keeps the logo, a search icon and a menu button; links move into the menu. The column is full width with
16px margins.

## Sidebar

- **Width.** Labelled sidebars run 210-292px, median 230.
- **Rows.** A 32px hit area on a 34px pitch is the mode; roomy versions run 40-52px on a 42-60px pitch. Icons about 16px,
  outline. Labels 14px at 400, 8-10px after the icon.
- **Active item.** Default: a neutral grey pill with the label unchanged on light, radius 4-16, inset 8-14px, and brightness
  alone on dark (#bbb to #fff). A left accent bar appears once in 23.
- **Groups.** Sentence-case grey labels at 12-13px, or hairlines. Settings and help go to the bottom.
- **Product named** (*judgement*). The mark and name sit at the top; the scope is a switcher or breadcrumb. A screen whose
  product cannot be named from the screenshot reads as a template.
- **Counts on nav items** (*judgement*). Only on a queue needing action, with the noun clear: "Requests 5", never "Range and
  prices 9".
- **Labels by default,** unless the product has five destinations or fewer and the screen needs the width.
- **Nav items are other screens,** never anchors into the current page.

## Top bar

The default is none; 14 of 23 have one. Heights are 44-51px on light chrome, or 64px with a 1px rule. It must hold something
real: search, the switcher, or the page or object name.

## Right rail and pinned columns

Use a right rail only for a stable secondary stream: recent items, the selected object's details, share links. One screen
has a fixed 384px column in a `1fr 384px` grid with a 24px gap, starting level with the first card, not the title. A pinned
left column appears once, keeping net worth in view while the rest scrolls.

No floating button unless it is the screen's one primary action and covers nothing at any width (*judgement*).

## Canvas

- **Fluid** (14 screens): side padding 17-64px, median 29; content about 1204px wide.
- **Centred** (8 screens): median about 1126px. Data pages land at 1100-1250 either way. The 624 and 864px columns were flagged
  for wasting the width.
- **Top offset** to the title: 20-36px for tools, 50-88px for greeting homes.
- **One gutter.** Use one gap value in both directions. Mixed gutters were flagged on 8 screens.

### One left edge, one right edge

The strongest screens run a single left edge from header to last row. Row rules may bleed 7-8px past the text column while
the text stays on it. The grid's arithmetic closes, as in 3 x 372 + 2 x 18 = 1152; write your sum down.

Failures from the study: cards stopping 120px short of the sheet's edge, a 0px right gutter against a 40px left one, and a
column centred on the window instead of the area beside the sidebar.

### Fit the grid to the data

**Dead space from a grid that does not fit the data** is the commonest failure, on 10 screens: four KPI tiles in a
three-column grid, one card alone beside 810px of nothing, a card stretched with 250px of blank under its legend. Choose the
column count from the number of items, let a lone card span, and do not stretch a frame over empty space.

**Cards sharing a row share a bottom edge** (*judgement*). Balance the row by content first: cap both lists at the same count
or pair blocks of similar height. Two stacked cards beside a tall card count as one block. Only when the contents cannot
balance, stack the blocks, or let the shorter card fill the row with content at the top and its action or total pinned to
the bottom.

**A stretched card stretches only when it has content to fill** (*judgement*). Only an action or a total may be pinned to its
foot; a legend stays directly under its chart. Otherwise move its footer link into its header, choose a
neighbour of similar height, or stack the blocks. A blank band over about 40px inside a card is a
hole.

**Narrow blocks do not span an overview** (*judgement*). A table of five columns or fewer, or a list of six rows or fewer, runs
to about 760px at 1440 and pairs with the next block.

## Title

- **Every screen has one h1.** 14 screens set it in the canvas at 18-48px, median 24, at 600-700. Elsewhere a breadcrumb's
  last item is the h1, at 16px.
- **A noun, not a greeting:** "Analytics", or the object's name. A greeting suits only a personal or team home, and never has
  an emoji.
- **Optional second line:** one 14-16px grey sentence about the data, such as the finding, period or scope. It is never about
  the interface; "this page shows…" reads as instructions.
- **Right of the title:** real actions only, or a freshness stamp with a refresh button.
- **The primary action.** One per screen. 12 of 23 have no filled primary; 5 are near-black or inverted; 4 use the brand hue.

## Tabs, filters and date range

- **The date range** goes at page level or on each card, never both. A card stating its own period puts it in its header,
  right-aligned, in grey.
- **Underline tabs** sit on a full-width 1px rule. The indicator is 1-4px, as wide as the label or 8-11px past it.
- **A segmented control** is as wide as its options, and full width only below about 480px.
- **Control height** in title and filter rows is 28-40px, clustering at 32 and 36.
- **Order:** scope on the left (date first, then filters), utility and refresh on the right.
- **Compound filters** can read as a sentence: "Date | Jun 14 - Jul 13 | Daily", 28px tall and 8px apart.
- **To the first card:** 13-64px, median 24.

## Density

| Density | Data points | Typical screens | Card padding | Rows | Body |
| --- | --- | --- | --- | --- | --- |
| Sparse | 6-25 | homes, settings, a single object | 20-24px | 56-92px | 14-16px |
| Medium | 25-50 | analytics, finance homes, lists | 16-24px | 44-56px | 14px (*judgement*) |
| Dense | about 120 | research and monitoring | 32px, framed by generous air | 28px lists, 42px tables | 13px |

- Density is row pitch, padding and type size moved together. Do not shrink the type and keep the padding.
- **Placed space reads as calm; leftover space reads as unfinished.** Emptiness looks deliberate when it comes from a fixed
  grid and repeated gaps.
- **Design for the data the account has.** Keep the honest drawing, but size the block to the question, not to the data the
  product hopes for.

## Phone

All *judgement*: the study has no phone screens.

- **Navigation folds** to a 48px top bar with a menu button and at most one action, or a bottom bar of four or five
  destinations. An icon rail becomes that bottom bar.
- **Margins** 16-20px. Touch targets at least 44px tall. Data and labels at 14px, sublines no smaller than 12px.
- **The title stays** at 20-24px. Header actions move into a kebab, except the one primary.
- **Filters** collapse into one row of chips or a Filters sheet. Tabs scroll sideways inside their own row, never the page.
  The first list row starts in the top 60% of the screen.
- **KPIs** become a 2-column grid or a list of label-value rows, never four squeezed columns. In a 2-column grid the count
  after any full-width lead is even, or the last cell takes the full width.
- **At most one row of controls above a chart.**
- **Charts** go full width, 160-200px tall, with 3-4 x labels. A y tick never sits on the line. A legend that would wrap to
  three lines becomes a 2-column grid or sits behind a "Key" disclosure.
- **Row actions** are text actions or one compact trailing button, with one filled bulk action for the list.
- **When a strip collapses, drop the item least relevant to the main action,** not the last in source order.
- **Tables become two-line rows below about 640px.** Identity and key number on line 1, other fields in 13px grey on line 2,
  the one action at the right. Fields move; they are never dropped. A table that must stay a table scrolls inside its own
  frame with its first column fixed.
- **Tablet, 641-1100px, is its own band.** The sidebar folds to the top bar, tables keep four or five columns with secondary
  fields as sublines, and two panels stack once either would be under about 340px.
- **Blocks that carry an action move up, not down.** A rail with an action becomes a one-line summary above the list: "5 items
  low · Review".
- **Several panes:** one region at a time. Choosing a row pushes the detail; back returns to the list at its scroll position.
- **Settings:** the label column stacks above its panel.
- **A right rail** moves under the main column or into a tab.
- **A plan or map with cells under 44px** is for reading on a phone; a list beneath it carries the actions.
- **Builders** show the work read-only, with the palette as a bottom sheet if editing stays.
