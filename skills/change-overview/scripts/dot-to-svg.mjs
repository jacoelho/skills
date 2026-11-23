#!/usr/bin/env node
// Renders Graphviz DOT files as SVG fragments for inline use in a themed HTML page, writing chart.svg beside chart.dot.
// Usage: node dot-to-svg.mjs <chart.dot>...
// Several files are laid out together: every box takes the place and size it has in one layout of all their edges, so a
// Before and a Now chart keep each shared box in the same place. A box whose label differs from its label in the first
// chart must carry class "changed" there, so a rename is always deliberate and visible. Pinned charts cannot hold
// clusters, which Graphviz does not draw at fixed positions.
import { execFileSync, spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const files = process.argv.slice(2)
if (files.length === 0) {
	console.error("Usage: node dot-to-svg.mjs <chart.dot>...")
	process.exit(2)
}

class Refusal extends Error {}
const style = ["-Gbgcolor=transparent", "-Nfontname=Helvetica", "-Efontname=Helvetica", "-Nfontsize=12", "-Efontsize=11"]

// An edge's id is its two boxes, its label and its place among edges sharing those, so an edge drawn in both charts is
// laid out once and keeps one route.
const tag = String.raw`
BEGIN { int seen[string]; }
E {
	string key = sprintf("%s->%s|%s", $.tail.name, $.head.name, hasAttr($, "label") ? aget($, "label") : "");
	coid = sprintf("%s#%d", key, seen[key]);
	seen[key] = seen[key] + 1;
}`

// Joins the charts into one graph to lay out, each shared edge once. A box labelled differently in two charts is laid
// out with both labels, so it has room for either; it must be marked "changed" in each chart where its label differs
// from the first. Labels are set last because cloning an edge copies its boxes again.
const joinCharts = String.raw`
BEGIN { graph_t U; int charts = 0; string first[string]; string named[string]; int kept[string]; }
BEG_G {
	if (charts == 0) { U = graph("layout", isDirect($G) ? "D" : "U"); copyA($G, U); }
	charts = charts + 1;
}
N {
	string text = (hasAttr($, "label") && strcmp(aget($, "label"), "\\N") != 0) ? aget($, "label") : $.name;
	string kind = hasAttr($, "class") ? aget($, "class") : "";
	if (!($.name in first)) { first[$.name] = text; named[$.name] = text; }
	else if (strcmp(first[$.name], text) != 0) {
		if (match(kind, "changed") < 0) {
			printf(2, "dot-to-svg: box %s is labelled \"%s\" in the first chart and \"%s\" in chart %d; mark it class=\"changed\" there\n", $.name, first[$.name], text, charts);
			exit(3);
		}
		if (strcmp(named[$.name], text) != 0) named[$.name] = sprintf("%s\\n%s", named[$.name], text);
	}
	clone(U, $);
}
E { if (!($.coid in kept)) { kept[$.coid] = 1; clone(U, $); } }
END {
	string box;
	for (named[box]) aset(isNode(U, box), "label", named[box]);
	write(U);
}`

// Reads the shared layout, then one chart: gives the chart's boxes their laid-out positions and sizes, its edges their
// routes, and two invisible corner points so that every chart spans the same canvas.
const place = String.raw`
BEGIN { graph_t L; int done = 0; edge_t laid[string]; }
BEG_G {
	if (!done) {
		L = clone(NULL, $G); done = 1;
		node_t v; edge_t f;
		for (v = fstnode(L); v; v = nxtnode(v)) for (f = fstout(v); f; f = nxtout(f)) laid[f.coid] = f;
	} else {
		node_t w, u; edge_t e; float x0, y0, x1, y1;
		for (w = fstnode($G); w; w = nxtnode(w)) {
			u = isNode(L, w.name); w.pos = u.pos; w.width = u.width; w.height = u.height; w.fixedsize = "shape";
			for (e = fstout(w); e; e = nxtout(e)) { e.pos = laid[e.coid].pos; if (hasAttr(laid[e.coid], "lp") && aget(laid[e.coid], "lp") != "") e.lp = aget(laid[e.coid], "lp"); }
		}
		sscanf(L.bb, "%f,%f,%f,%f", &x0, &y0, &x1, &y1);
		w = node($G, "__corner_low"); w.shape = "point"; w.style = "invis"; w.width = "0.01"; w.label = ""; w.pos = sprintf("%f,%f", x0, y0);
		w = node($G, "__corner_high"); w.shape = "point"; w.style = "invis"; w.width = "0.01"; w.label = ""; w.pos = sprintf("%f,%f", x1, y1);
		write($G);
	}
}`

function run(command, args, input) {
	try {
		return execFileSync(command, args, { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 64 << 20 })
	} catch (error) {
		throw new Refusal(error.stderr?.trim() || `${command} failed: ${error.message}`)
	}
}

// Graphviz emits black strokes, a fixed size in points, node ids that collide between figures on one page, and <title>
// elements that browsers show as tooltips. The fragment draws in currentColor and scales down with its container but
// never above its drawn size, so a small chart keeps the text size of a large one. It has no role="img", which would hide
// the box and arrow labels from screen readers; the figure caption names the chart.
function theme(svg) {
	const themed = svg
		.replace(/^[\s\S]*?(?=<svg\b)/, "")
		.replace(/<!--[\s\S]*?-->\n?/g, "")
		.replace(/<title>[\s\S]*?<\/title>\n?/g, "")
		.replace(/ id="[^"]*"/g, "")
		.replace(/(stroke|fill)="black"/g, '$1="currentColor"')
		.replace(/ font-family="[^"]*"/g, ' font-family="inherit"')
		.replace(/<svg\s+width="([\d.]+)pt"\s+height="[\d.]+pt"/, (_, width) => `<svg fill="currentColor" style="max-width:${Math.floor((Number(width) * 4) / 3 + 0.5)}px"`)
	if (!themed.startsWith('<svg fill="currentColor"')) throw new Refusal("dot-to-svg: unexpected Graphviz output; the SVG root was not themed")
	return `${themed.replace(/\n+$/, "")}\n`
}

function render(work) {
	for (const file of files) {
		if (!file.endsWith(".dot")) throw new Refusal(`dot-to-svg: ${file} does not end in .dot`)
		if (!existsSync(file)) throw new Refusal(`dot-to-svg: ${file} does not exist`)
	}
	for (const tool of files.length === 1 ? ["dot"] : ["dot", "neato", "gvpr"]) {
		if (spawnSync(tool, ["-V"]).error) throw new Refusal(`dot-to-svg: Graphviz '${tool}' is not installed`)
	}
	if (files.length === 1) return [theme(run("dot", ["-Tsvg", ...style, files[0]]))]

	for (const file of files) {
		if (/subgraph\s*"?cluster/.test(readFileSync(file, "utf8"))) throw new Refusal(`dot-to-svg: ${file} has a cluster, which a pinned chart cannot draw`)
	}
	const tagged = files.map((file, index) => {
		const path = join(work, `${index}.dot`)
		writeFileSync(path, run("gvpr", ["-c", tag, file]))
		return path
	})
	const layout = join(work, "layout.dot")
	writeFileSync(layout, run("dot", ["-Tdot", ...style], run("gvpr", [joinCharts, ...tagged])))
	return tagged.map(path => theme(run("neato", ["-n2", "-Tsvg", ...style], run("gvpr", [place, layout, path]))))
}

const work = mkdtempSync(join(tmpdir(), "dot-to-svg-"))
try {
	const svgs = render(work)
	files.forEach((file, index) => writeFileSync(file.replace(/\.dot$/, ".svg"), svgs[index]))
} catch (error) {
	if (!(error instanceof Refusal)) throw error
	console.error(error.message)
	process.exitCode = 1
} finally {
	rmSync(work, { recursive: true, force: true })
}
