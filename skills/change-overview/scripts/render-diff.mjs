#!/usr/bin/env node
// Renders the line diff of two shortened code files as a static HTML figure for a change-overview page.
// Usage: node render-diff.mjs --repo <https://github.com/o/r> --sha <commit> --path <repo path> --line <n> [--title <text>] <old file|-> <new file|->
// Pass "-" for a side that does not exist (new or deleted code). The figure carries data-added and data-removed,
// the counts the page's shown-lines budget sums, and links its caption to path:line at sha.
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { parseArgs } from "node:util"

const { values, positionals } = parseArgs({
	options: {
		repo: { type: "string" },
		sha: { type: "string" },
		path: { type: "string" },
		line: { type: "string" },
		title: { type: "string" },
	},
	allowPositionals: true,
})
const missing = ["repo", "sha", "path", "line"].filter(name => !values[name])
if (missing.length > 0 || positionals.length !== 2 || positionals.every(file => file === "-")) {
	console.error("Usage: node render-diff.mjs --repo <url> --sha <commit> --path <path> --line <n> [--title <text>] <old|-> <new|->")
	if (missing.length > 0) console.error(`render-diff: missing --${missing.join(", --")}`)
	process.exit(2)
}
if (!/^[0-9a-f]{7,40}$/.test(values.sha)) {
	console.error(`render-diff: --sha ${values.sha} is not a commit id`)
	process.exit(2)
}
if (!/^[1-9][0-9]*$/.test(values.line)) {
	console.error(`render-diff: --line ${values.line} is not a line number`)
	process.exit(2)
}

const [oldFile, newFile] = positionals
const read = file => (file === "-" ? "" : readFileSync(file, "utf8"))
const rows = diffRows(read(oldFile), read(newFile), oldFile, newFile)
const added = rows.filter(row => row.kind === "add").length
const removed = rows.filter(row => row.kind === "del").length

const escape = text => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const mark = { add: "+", del: "−", ctx: " " }
const label = { add: "added", del: "removed", ctx: "unchanged" }
const href = `${values.repo.replace(/\/$/, "")}/blob/${values.sha}/${values.path}#L${values.line}`
const caption = values.title ? `${escape(values.title)} ` : ""
const lines = rows
	.map(row => `<span class="l ${row.kind}" title="${label[row.kind]}"><span class="m" aria-hidden="true">${mark[row.kind]}</span>${escape(row.text) || " "}</span>`)
	.join("")

process.stdout.write(
	`<figure class="code" data-path="${escape(values.path)}" data-line="${values.line}" data-sha="${values.sha}" data-added="${added}" data-removed="${removed}">` +
		`<figcaption>${caption}<a class="cite" href="${escape(href)}" data-path="${escape(values.path)}" data-line="${values.line}" data-sha="${values.sha}">${escape(values.path)}:${values.line}</a></figcaption>` +
		`<pre><code>${lines}</code></pre></figure>\n`,
)

// diffRows returns every line of both sides in diff order. git compares the files with whitespace changes ignored, as a
// reviewer reads a re-indented line as unchanged; unchanged rows show the new side's text.
function diffRows(oldText, newText, oldFile, newFile) {
	if (oldText === "") return splitLines(newText).map(text => ({ kind: "add", text }))
	if (newText === "") return splitLines(oldText).map(text => ({ kind: "del", text }))
	let output = ""
	try {
		execFileSync("git", ["diff", "--no-index", "--no-color", "--ignore-space-change", "-U1000000", oldFile, newFile], { encoding: "utf8" })
	} catch (error) {
		if (error.status !== 1) throw error
		output = error.stdout
	}
	if (output === "") return splitLines(newText).map(text => ({ kind: "ctx", text }))
	const body = output.split("\n")
	const start = body.findIndex(line => line.startsWith("@@"))
	const rows = []
	for (const line of body.slice(start + 1)) {
		if (line === "\\ No newline at end of file" || line.startsWith("@@")) continue
		const kind = { "+": "add", "-": "del", " ": "ctx" }[line[0]]
		if (kind) rows.push({ kind, text: line.slice(1) })
	}
	while (rows.length > 0 && rows.at(-1).kind === "ctx" && rows.at(-1).text === "") rows.pop()
	return rows
}

function splitLines(text) {
	const lines = text.split("\n")
	if (lines.at(-1) === "") lines.pop()
	return lines
}
