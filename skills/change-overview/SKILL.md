---
name: change-overview
description: "Builds one page that explains a large or unfamiliar pull request or branch to the person who must approve and own it: how the components connect, how data flows, what changed, and what it implies, all taken from the code. Use when asked to explain, walk through or give an overview of a PR or diff before approving it. Not a defect hunt (use code-review) or a design judgement (use jacoelho:architecture-review)."
argument-hint: "[PR number | URL | branch; default: the PR of the current branch]"
---

# Change overview

The reader must approve this change and own it afterwards, and does not know the code well. After reading the page they can say, from memory and in their own words: which components the change touches and how they connect, how data moves through them before and after, what changed and why it had to change together, and what the change costs or puts at risk. The page builds that model. It does not judge the change or list defects.

The reader builds context first and then jumps around, so the page leads with the system and the reading order and lets every section stand on its own.

The scripts need `git` and `node`; a pull request needs `gh`; diagrams need Graphviz (`dot`, `neato` and `gvpr`). Without Graphviz, leave the diagrams out, keep the component list and the traced input, and say in the coverage box that the page has no diagrams and why.

## Code is the evidence

Every statement on the page comes from code at the head commit or at the merge base, and cites `path:line`. The PR description, commit messages, ADRs, design documents, code comments and test names are claims. They tell you where to look and what the author intended. They are not evidence of what the code does.

- Read each claim, then check it against the code. When the page repeats one, label it as the author's and mark it **confirmed** (cite the code), **contradicted** (cite the code and say what it does instead) or **unchecked** (say why: a measurement you did not run, code you could not read). A contradiction is first-class content: put it in the section it concerns.
- Take a test's behaviour from its assertions, never from its name. Read the full body before saying what it checks.
- Take an edge in a diagram from a call, import, message, query or write in the code. An edge you cannot cite does not go in the diagram. Cite the code behind each edge in the text that describes the components or the section that covers the edge.
- Take a trade-off from what the code does: a guarantee it weakens, a cost it adds to a path, a safety net it removes, a parallel path it keeps. An author's stated trade-off is a claim like any other.
- When you cannot read something the page depends on, such as generated code, another repository or runtime configuration, say so in the coverage box rather than infer it.

## Steps

### 1. Fix the change

Resolve the head commit and the merge base. For a PR, `gh pr view <pr> --json number,title,body,url,baseRefName,headRefOid,additions,deletions,changedFiles`. For a branch without a PR, the head is `git rev-parse <branch>` and the base is the repository's default branch (`git symbolic-ref refs/remotes/origin/HEAD`) unless the user names another. Then `git merge-base <base> <head>`. For a merged PR, take the merge base against the first parent of its merge commit (`gh pr view <pr> --json mergeCommit`, then `git merge-base <merge commit>^1 <head>`): after a rebase merge the head can already be on the base branch, and `git merge-base <base> <head>` then returns the head itself. Read code at either commit with `git show <sha>:<path>`, or add a detached worktree under the scratchpad. In zsh write `"${sha}:${file}"`: zsh reads `$sha:path` as a variable modifier, and it ties a variable named `path` to `PATH`. Never switch branches or stash in the user's working tree.

Collect `git diff <merge base> <head>` and the changed files with their counts. The PR description and commit messages are claims to check against the code (see [Code is the evidence](#code-is-the-evidence)).

**Done when** you have the head SHA, the merge base, the diff and the list of changed files.

### 2. Sort the files before reading them

Classify each changed hunk by what it does (a file can hold both a move and a behaviour change), using `git diff --stat`, `git diff -M -C --summary` for moves and copies, and a whitespace-insensitive diff (`-w`). Git finds copies only from files that existed at the base: when two new files look parallel (one rule or handler per language, say), `diff` them against each other.

Give each hunk one class:

- **Mechanical:** renamed or moved with an identical or near-identical body, formatting only, generated output, lockfiles, vendored code, the same one-line edit repeated at many call sites.
- **Contract:** exported types, signatures, schemas, wire or storage formats, configuration keys, public endpoints, events.
- **Behaviour:** everything else in production code.
- **Tests and fixtures.**
- **Documents and test data:** design notes, decision records, changelogs, test manifests and expected-output files. Treat documents as claims (see [Code is the evidence](#code-is-the-evidence)) and test data as part of the tests that read it. A document the code reads at run time (a prompt, a policy text, a template) is not a claim but input: classify it as contract.

Verify each mechanical classification before you rely on it: compare the moved body with its base version, or confirm that a repeated edit really is the same at every site. For a rename, replay it on the base with the language's rename tool (or a word-bounded substitution limited to the renamed identifier) in a scratch worktree and diff the result against the head: whatever remains is not part of the rename. A hunk you cannot verify is behaviour.

When the diff of behaviour and contract hunks does not fit comfortably in your context, read it group by group (step 4) and write each group's notes to the scratchpad before moving on, so later groups do not crowd out earlier findings.

**Done when** every changed hunk has one class, and every mechanical one has its proof.

### 3. Map the system before the change

Build the reader's starting point from the base, not from the diff:

- Find the components the change touches and their direct neighbours: the modules, services, jobs or stores that call into, or are called by, the changed code. A component is the unit the repository organises around (a package, service, module or app), not a file. When the whole change sits inside one such unit, the components are the stages or owners inside it (a parser, a compiler pass, a publication step), named after what they do; say so in the map's caption.
- Find the entry points that reach the changed code (handlers, consumers, CLI commands, scheduled jobs, exported functions) and the sinks it reaches (stores, queues, outbound calls, responses).
- Trace one concrete input from an entry point to a sink at the base. Pick the input the change matters most for, and use real names and values from the tests where possible.
- Collect the terms of this codebase that the reader will meet on the page, each with a one-sentence meaning taken from the code: a type's fields, what creates it and what reads it. Use its doc comment as a lead only.

Use the language server or a symbol search to find references and callers, not text search alone. Where neither is available, text search is the fallback: search for the name and for every string the code dispatches on (event names, keys, routes), and say in the coverage box that callers were found by text search.

When a claim is cheaper to settle by running code than by reading it (a limit that now rejects a schema, a request that now fails), run a small probe against a detached worktree of the base and of the head, in the scratchpad. Never change the user's working tree. Put the probe's command and the line of output that decides the claim beside the claim, in a `<pre>`, and list the probe in the coverage box; a run is evidence like a citation, but a reader cannot follow it as a link.

**Done when** you can state, citing code, what each touched component does and how the traced input moves at the base.

### 4. Split the change into groups

Split the behaviour and contract hunks into 3 to 8 groups, each one thing the reader must understand: a contract that changed shape, a responsibility that moved, a new path, a removed path. Put code in the same group when one part uses what the other defines, so that each group reads on its own. Never mix a refactor with a behaviour change in one group: show the refactor as mechanical, or as its own group when its scale matters.

For each group write:

- one sentence that says what is different, in terms of behaviour, with the component as subject ("The scheduler, not the client, now decides when a batch retries");
- its files and the `path:line` ranges that carry the change;
- the producer and consumer ends of every contract it changes;
- the **unchanged** code that depends on it. Find the references to each changed contract across the repository, including callers outside the diff. Implications mostly live there.

Then trace the same concrete input from step 3 through the head and note every point where its path, its shape or its outcome differs.

If the groups have no edge between them, say in the header that the change could have been split, and name the parts.

**Done when** every behaviour and contract hunk belongs to a group and each group has its sentence, its evidence and its dependents.

### 5. Order the groups

Order by dependency: a group that defines a contract comes before the groups that consume it. Within that order, put the group with the widest effect or the highest risk first. Readers give the most attention to what they see first. Tests come last unless a group is only understandable through its tests.

### 6. Work out implications and trade-offs

For each group, answer from the code:

- **Who notices:** which callers, consumers, stored data or operators see different behaviour, and how. Include unchanged callers found in step 4.
- **What it costs:** work added to a path that runs per request or per item, extra round trips, memory, contention, operational steps.
- **What it gives up:** a guarantee weakened, an error no longer surfaced, a fallback removed, a parallel path left in place.
- **What it assumes:** a precondition the new code relies on that nothing enforces.

Then go through [facets](references/facets.md) and keep only the facets whose subject this change has. Each kept facet becomes a question on the page with the evidence that answers it, or the note that the code does not answer it.

### 7. Write the page

Copy [the template](assets/template.html) to the scratchpad and fill each `{{slot}}` with the content of [Page](#page). Do not change its `<style>` block. Use only its markup for the parts the check reads:

- **Citation:** `<a class="cite" href="<repo>/blob/<sha>/<path>#L<n>" data-path="<path>" data-line="<n>" data-sha="<sha>">file:n</a>`, where `<sha>` is the head commit, or the merge base for code that the change removes. Cite the line that carries the point (the function's signature, the charge, the call), never a `package` line or a closing brace. Cite a comment only where the sentence quotes it as an author claim.
- **Code:** write the shortened old and new code of each figure to two files, then run `node ${CLAUDE_SKILL_DIR}/scripts/render-diff.mjs --repo <url> --sha <sha> --path <path> --line <n> --title "<what it shows>" <old|-> <new|->` and paste its output. Pass `-` for a side that does not exist. A figure covers one file: show a change that spans files as one figure per file. The figure carries the counts the budget check adds up.
- **Diagram:** `<figure class="diagram">` holding the output of `dot-to-svg.mjs`, or a `.pair` of a Before and a Now one, and a `<figcaption>` stating its question. The caption is the figure's accessible name, so it says what the chart shows, not only "Before".
- **Author claim:** `<div class="author-claim" data-status="confirmed|contradicted|unchecked"><q>the author's words</q><p>the evidence</p></div>`.
- **Predict, misreading, explain-back:** `<details class="predict">`, `<aside class="misreading">` with the wrong reading in `<p class="wrong">`, and the template's `<details class="explain">`.
- **Test:** a table row whose first cell has class `test-added`, `test-removed` or `test-modified`.

### 8. Check the page against the code

Run `node ${CLAUDE_SKILL_DIR}/scripts/check-page.mjs <page> --repo-dir <repository> --print-cites`; it only reads the repository with `git show`, and a worktree of it works as `--repo-dir`. It fails on an unfilled slot, a citation that does not exist at its commit or names another commit, an author claim without a status, more than 400 shown changed lines, a diagram without a caption, and a script loaded from elsewhere. It prints the cited line of every citation, marking comment lines with `(comment)`: read each one and confirm it shows what the sentence beside it says, and replace a cited comment with the code it describes unless the sentence quotes the comment as an author claim. The script cannot judge that.

Then confirm by reading:

- every diagram edge matches a call, write or reference in the code, and its label says what that code does;
- every test claim matches the test's assertions;
- every number on the page (file counts, line counts, steps) comes from a command you ran or from the code;
- the coverage box names everything you did not read or could not verify.

Fix what fails and run the check again. If a headless browser is available, render the page once in a wide and a narrow window (Chrome: `--headless=new --window-size=1280,2400 --screenshot=<png> file://<page>`, then 500 wide) and look at every diagram: a chart that reads at its drawn size can shrink until its text is unreadable. Headless Chrome lays a page out at least 500 px wide even when the window is narrower, so text cut off in a narrower screenshot is the screenshot, not the page.

### 9. Publish

Publish the page as a private artifact (icon `code`) and give the user the link. Without an artifact tool, write it to the scratchpad and give the full path. Republish updates to the same artifact. Do not edit the PR or post comments.

## Page

The page has these parts, in this order. Leave out a part the change does not have.

### Header

- The PR title, and links to the PR and the head commit.
- **Before** / **Now** lines: two to four sentences on what the system did and what it does now, in behaviour, not files.
- The size: changed lines and files, how many of those lines are mechanical, how many groups.
- Contradictions between the description and the code, if any, one line each, linking to the section.
- When the groups are independent, the parts the change could have been split into.

### System map

A diagram of the touched components and their neighbours, before and after (see [Diagrams](#diagrams)). Below it, one sentence per component on what it does, and the terms the reader needs, each defined once in one sentence from the code.

### Data flow

The concrete input from steps 3 and 4, traced from entry to sink at the base and at the head, as a diagram when the path has branches, crosses a process boundary or changes shape along the way, else as two short numbered lists. Name what each step carries ("order id, retry count"), not how it is computed.

### Reading order

The groups in order, each as its one sentence linking to its section. This is the index of the page.

### One section per group

1. The group's sentence as the heading's lead.
2. **Predict:** one collapsed question that makes the reader commit to an expectation before seeing the code, such as "What happens to a batch that times out halfway?" The answer, inside the collapsed block, cites the code. Ask one only where the answer is not obvious from the sentence.
3. The code, shortened (see [Code](#code)).
4. **Implications** and **trade-offs** from step 6, each citing code.
5. **Likely misreading**, only when the diff invites one: the wrong reading, labelled as wrong, and what the code shows instead. An extracted function that looks like new logic, or a renamed type that looks like a new one, are typical cases.
6. Author claims about this group, with their marks.

### Questions to settle before approving

The facet questions from step 6, each with its evidence or with "the code does not answer this". Order them by the reader's exposure, not alphabetically.

### Tests

What behaviours the tests pin down, by group, taken from the assertions. Tests the change removes, always. Behaviours from step 6 that no test covers.

### Safe to skim

The mechanical changes, grouped, each with its proof: "Moved from `a/x.go` to `b/x.go`, body identical at the base", "Same argument added at 14 call sites; one shown in group 2". Counts, not file lists, when there are many.

### Coverage

What the page did not read, did not verify, or took on trust: generated files skipped, another repository, runtime configuration, claims marked unchecked. The reader decides whether to look there.

### Explain it back

One closing prompt: "In two sentences: what does this change do, and what breaks if it is wrong?" Collapsed beneath it, your own two sentences.

## Code

- Show contracts, the two ends of each changed contract, the lines that carry a behaviour change, and code on a path that runs per request or per item.
- Show a dependent caller outside the diff when an implication depends on it: pass the same file as both sides to `render-diff.mjs`, which renders every line as unchanged and adds nothing to the budget, and say in `--title` that the code is unchanged.
- Shorten everything else: `// ...` for left-out statements, `/* ... */` for left-out expressions. Keep the enclosing declaration so the reader knows where a snippet lives. A shortened literal must not look complete.
- Show the base side wherever the change is a modification, shortened the same way, so unchanged lines line up.
- When most of the change is new code, spend the budget on the new contracts and the traced path.
- Show a moved or extracted body as a move: old location on the old side, new location on the new side. Never show it as new code.
- Show a removed safety net (error handling, fallback, validation) on the old side.
- Show one site of a repeated edit and say how many others there are.
- Do not show imports, test bodies, or input guards that the change does not touch.
- Keep the shown changed lines to at most 400 across the page, whatever the PR size; the check enforces it. When a group needs more, show its contract and its most consequential path, and list the rest under the group with links.
- Every snippet links to its `path:line` at the head commit, or at the merge base for removed code.

## Diagrams

Draw a diagram when the reader would otherwise assemble a mechanism from several sections: a connection that moves, a path that branches, a state that gains a transition. When a sentence says it, write the sentence.

Choose by what changed:

| What the change does | Diagram |
|---|---|
| Moves a responsibility, adds or removes a component, reroutes calls | Component graph, before and after |
| Changes a flow across processes, services or async boundaries | The traced input as a component graph with numbered arrow labels (`1 request`, `2 enqueue`), before and after |
| Adds or changes states or transitions | State diagram, changed transitions marked |
| Changes who writes or reads a store or a fact | Component graph with the stores as boxes and the writes and reads as labelled arrows |

Rules:

- One diagram answers one question, stated in its caption.
- Each box is a component and appears once per diagram. Never repeat a box to make the layout easier.
- Each arrow is labelled with a verb or with what it carries, in a few words.
- Mark what the change adds and removes, with a word or symbol as well as colour. In a before and after pair, keep the same boxes in the same places.
- When most of the change is new code, the Before chart is the system the new code plugs into: the entry point, extension point or dispatcher it registers with, and the stores and outside systems it touches.
- Show the main path. Secondary components (shared libraries, type-only dependencies) are muted and to the side. Leave error paths and retries to the text unless the change is about them.
- About 12 boxes at most. A bigger system gets a map of components with the detail in a second diagram.
- No code notation on boxes or arrows: plain words, with the code name in the caption when the reader needs it to find the thing.

Produce the diagram as inline SVG with no runtime. Do not load a diagram renderer from a CDN.

- Write it in Graphviz DOT with boxes, labelled arrows and nothing else: no colours, shapes or fonts. Layout spacing (`nodesep`, `ranksep`, `rankdir`) is allowed when labels collide. Mark what the change adds with `class="added"` and a `+ ` label prefix, what it removes with `class="removed"`, `style=dashed` and a `− ` label prefix, and a box it renames or redefines with `class="changed"` and a `~ ` label prefix in the Now chart, so the mark reads without colour. Give secondary boxes and their arrows `class="muted"`.
- Render it with `node ${CLAUDE_SKILL_DIR}/scripts/dot-to-svg.mjs chart.dot`, which writes `chart.svg` beside it. The output draws in `currentColor`, keeps the classes, and scales down with its container but never above its drawn size. The template colours `added`, `removed`, `changed` and `muted`.
- Render a Before and a Now chart in one call, `dot-to-svg.mjs before.dot now.dot`: the script lays out both charts' edges together, so every box shared by the two stands in the same place on the same canvas, and an arrow with the same ends and label in both keeps one route. A shared box has the same node name in both files. A box whose label differs between the charts must be marked `changed` in the Now chart, and the script refuses an unmarked difference, so a slip in a label never reads as a change; the marked box keeps its place and is drawn at one size in both charts, big enough for either label. A pinned pair cannot hold clusters; when the map needs them, draw one chart of the system now, with removed arrows kept as `class="removed"` and dashed.
- The template stacks the Before chart above the Now chart at full width, so each shared box sits straight above its counterpart. Prefer top to bottom (the default) for a chart with many boxes: a wide left-to-right chart shrinks to fit the column.

## Words

- Write for an engineer who knows the language and the product but not this code. Define a term of this codebase once, at first use, in one sentence from the code.
- Make the subject of each sentence the component that does the action. "The scheduler retries the batch", not "the batch is retried".
- Say what the code does now. Put alternatives the author says they considered with the author claims of their group, marked like any other claim, not in the description of the current code.
- Do not restate in prose what the shown code already shows. Prose carries the why, the consequence and the cost.
- No praise, no verdict on the change, no defect hunting. When you see a defect while reading, list it at the end of your reply to the user, outside the page.
