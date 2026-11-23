#!/usr/bin/env node
// Checks a change-overview page against the repository it describes.
// Usage: node check-page.mjs <page.html> [--repo-dir <dir>] [--max-shown <n>] [--print-cites]
// Run it from the repository, or pass --repo-dir. It exits 1 and lists every problem when the page fails a check, and
// with --print-cites also prints each cited line, marking comment lines, so a reader can confirm it shows what the
// sentence says.
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { parseArgs } from "node:util"

const { values, positionals } = parseArgs({
	options: {
		"repo-dir": { type: "string", default: "." },
		"max-shown": { type: "string", default: "400" },
		"print-cites": { type: "boolean", default: false },
	},
	allowPositionals: true,
})
if (positionals.length !== 1) {
	console.error("Usage: node check-page.mjs <page.html> [--repo-dir <dir>] [--max-shown <n>] [--print-cites]")
	process.exit(2)
}

const page = readFileSync(positionals[0], "utf8")
const problems = []
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1]

for (const slot of new Set(page.match(/\{\{[a-z-]+\}\}/g) ?? [])) problems.push(`unfilled template slot ${slot}`)

const main = page.match(/<main\b[^>]*>/)?.[0] ?? ""
const head = attr(main, "data-head")
const base = attr(main, "data-base")
if (!head || !base) problems.push("<main> lacks data-head or data-base")

const fileCache = new Map()
function fileAt(sha, file) {
	const key = `${sha}:${file}`
	if (!fileCache.has(key)) {
		try {
			const text = execFileSync("git", ["-C", values["repo-dir"], "show", key], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 })
			fileCache.set(key, text.split("\n"))
		} catch {
			fileCache.set(key, null)
		}
	}
	return fileCache.get(key)
}

const cites = [...page.matchAll(/<a\b[^>]*\bclass="cite"[^>]*>/g)].map(match => match[0])
if (cites.length === 0) problems.push("the page cites no code")
const seen = new Set()
for (const tag of cites) {
	const file = attr(tag, "data-path")
	const line = Number(attr(tag, "data-line"))
	const sha = attr(tag, "data-sha")
	if (!file || !Number.isInteger(line) || line < 1 || !sha) {
		problems.push(`citation without data-path, data-line and data-sha: ${tag}`)
		continue
	}
	if (sha !== head && sha !== base) {
		problems.push(`${file}:${line} cites ${sha}, neither the head nor the merge base`)
		continue
	}
	const lines = fileAt(sha, file)
	if (lines === null) {
		problems.push(`${file} does not exist at ${sha.slice(0, 9)}`)
		continue
	}
	if (line > lines.length || (line === lines.length && lines[line - 1] === "")) {
		problems.push(`${file}:${line} is past the end of the file at ${sha.slice(0, 9)}`)
		continue
	}
	const key = `${sha}:${file}:${line}`
	if (values["print-cites"] && !seen.has(key)) {
		seen.add(key)
		const text = lines[line - 1].trim()
		const comment = /^(\/\/|\/\*|\*|#(?![!\[])|<!--|-- )/.test(text) ? "(comment) " : ""
		console.log(`${sha.slice(0, 7)} ${file}:${line} | ${comment}${text.slice(0, 110)}`)
	}
}

const claims = [...page.matchAll(/<[a-z]+\b[^>]*\bclass="author-claim"[^>]*>/g)].map(match => match[0])
for (const tag of claims) {
	const status = attr(tag, "data-status")
	if (!["confirmed", "contradicted", "unchecked"].includes(status)) problems.push(`author claim with status ${status ?? "missing"}: ${tag}`)
}

let shown = 0
for (const match of page.matchAll(/<figure\b[^>]*\bclass="code"[^>]*>/g)) {
	const added = Number(attr(match[0], "data-added"))
	const removed = Number(attr(match[0], "data-removed"))
	if (!Number.isInteger(added) || !Number.isInteger(removed)) problems.push(`code figure without data-added and data-removed: ${match[0]}`)
	else shown += added + removed
}
const maxShown = Number(values["max-shown"])
if (shown > maxShown) problems.push(`the page shows ${shown} changed lines, more than ${maxShown}`)

for (const match of page.matchAll(/<figure\b[^>]*\bclass="diagram"[^>]*>([\s\S]*?)<\/figure>/g)) {
	if (!/<figcaption>[\s\S]*\S[\s\S]*<\/figcaption>/.test(match[1])) problems.push("a diagram has no caption")
	if (/<script|<foreignObject/i.test(match[1])) problems.push("a diagram holds a script or foreignObject")
}

if (/<script\b[^>]*\bsrc=/i.test(page)) problems.push("the page loads a script from elsewhere")

console.log(`${cites.length} citations, ${claims.length} author claims, ${shown} shown changed lines`)
if (problems.length > 0) {
	for (const problem of problems) console.log(`problem: ${problem}`)
	process.exit(1)
}
