#!/usr/bin/env node
// Runs geometry.js on a page at several widths in headless Chromium and writes
// one JSON report and one annotated full-page screenshot per width.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const here = dirname(fileURLToPath(import.meta.url));
const references = join(here, "..", "references");
const GEOMETRY = readFileSync(join(here, "geometry.js"), "utf8");
const MAX_HEIGHT = 20_000;

const USAGE = `usage: node audit.mjs <url> [options]

  --out <dir>        where reports and screenshots go (default .geometry)
  --widths <list>    viewport widths (default 1440,768,390)
  --height <px>      viewport height (default 900)
  --style <slug>     tokens from references/styles.md over the foundation defaults
  --tokens <file>    "name: 12px" lines or a JSON object; applied after --style
  --root <selector>  the canvas (default main, then [role=main], then body)
  --exclude <sel>    regions laid out by data, such as a timeline or map
  --containers <sel> elements to measure as containers besides landmarks and surfaces
  --wait-for <sel>   wait up to 60s for this selector before measuring
  --prep <file.mjs>  default-exports async (page, width) => {} run before measuring
  --scheme <s>       light or dark
  --settle <ms>      wait after load (default 500)

Playwright is resolved from this folder's ancestors or PW_DIR; CHROMIUM_PATH
points at an existing Chromium build.`;

export function styleTokens(slug) {
  const foundation = readFileSync(join(references, "foundation.md"), "utf8");
  const base = foundation.match(/Either theme:\s*```\n([\s\S]*?)```/);
  if (!base) throw new Error("foundation.md: no code block after 'Either theme:'");
  const styles = readFileSync(join(references, "styles.md"), "utf8");
  const section = styles.split(/^## /m).find((s) => s.split("\n")[0].includes(`(\`${slug}\`)`));
  if (!section) {
    const known = [...styles.matchAll(/^## .*\(`([a-z-]+)`\)/gm)].map((m) => m[1]);
    throw new Error(`unknown style ${slug}; styles.md has ${known.join(", ")}`);
  }
  const block = section.match(/```\n([\s\S]*?)```/);
  if (!block) throw new Error(`styles.md: style ${slug} has no token block`);
  return `${base[1]}\n${block[1]}`;
}

export function loadPlaywright() {
  const roots = [process.env.PW_DIR, here, process.cwd()].filter(Boolean);
  for (const root of roots) {
    try {
      return createRequire(join(resolve(root), "noop.js"))("playwright");
    } catch (err) {
      if (err.code !== "MODULE_NOT_FOUND") throw err;
    }
  }
  throw new Error(`playwright not found from ${roots.join(", ")}. Install it into a scratch folder with 'npm i --prefix <dir> playwright', then set PW_DIR=<dir>.`);
}

// Evaluated rather than added as a script tag, so a page whose Content-Security-Policy forbids
// inline scripts is measured too.
export async function audit(page, opts = {}) {
  await page.evaluate(GEOMETRY);
  return page.evaluate((o) => window.__geometry(o), opts);
}

// A shell whose main scrolls shows only the viewport, in the capture and to the measurement.
// Growing the viewport by what each large scroller hides lets both see everything; the document's
// own scrolling is left to the full-page capture. Returns the height still hidden at the cap.
export async function fitScrollers(page) {
  let hidden = 0;
  for (let i = 0; i < 4; i++) {
    hidden = await page.evaluate(() =>
      Math.max(0, ...[...document.body.querySelectorAll("*")]
        .filter((el) => /auto|scroll/.test(getComputedStyle(el).overflowY) && el.clientHeight >= innerHeight / 2)
        .map((el) => el.scrollHeight - el.clientHeight)),
    );
    const { width, height } = page.viewportSize();
    if (hidden <= 1 || height >= MAX_HEIGHT) break;
    await page.setViewportSize({ width, height: Math.min(MAX_HEIGHT, height + hidden) });
  }
  return hidden > 1 ? hidden : 0;
}

// One name per screen state: the route with its query and hash, an index file's folder, and the prep script.
export function reportName(url, prep) {
  const { protocol, pathname, search, hash } = new URL(url);
  let route = `${pathname}${search}${hash}`;
  if (protocol === "file:") {
    const parts = pathname.split("/");
    route = /^index\./.test(parts.at(-1)) ? parts.slice(-2).join("/") : parts.at(-1);
  }
  const slug = (v) => v.replace(/\W+/g, "-").replace(/^-|-$/g, "");
  return [slug(route) || "root", prep && slug(basename(prep, extname(prep)))].filter(Boolean).join("-");
}

export function readTokens(file) {
  const text = readFileSync(file, "utf8");
  if (!/^\s*\{/.test(text)) return text;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${file}: not valid JSON: ${err.message}`);
  }
}

function summary(report) {
  const g = (groups) => groups.map((x) => `${x.px}${x.token ? `=${x.token}` : ""}(${x.count})`).join(" ") || "-";
  const c = report.census;
  const lines = [
    `## ${report.meta.viewport.width}px  root ${report.meta.root}  canvas ${report.meta.canvas}  blocks ${report.meta.blocks}`,
    `   edges     left ${g(report.edges.left)}  right ${g(report.edges.right)}`,
    `   gutters   ${g(report.gutters)}`,
    `   type      ${c.fontSizes.length} sizes ${g(c.fontSizes)}; ${c.fontWeights.length} weights ${c.fontWeights.join(" ")}`,
    `   radius    cards ${g(c.radii.cards)}  controls ${g(c.radii.controls)}  chips ${g(c.radii.chips)}`,
    `   controls  ${g(c.controlHeights)}`,
    `   insets    ${g(c.cardInsets)}`,
    `   shadows   ${c.shadows.length}`,
    `   findings  ${report.findings.length}`,
    ...report.findings.map((f) => `   - [${f.check}] ${f.message}`),
  ];
  return lines.join("\n");
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: "string", default: ".geometry" },
      widths: { type: "string", default: "1440,768,390" },
      height: { type: "string", default: "900" },
      style: { type: "string" },
      tokens: { type: "string" },
      root: { type: "string" },
      containers: { type: "string" },
      exclude: { type: "string" },
      prep: { type: "string" },
      "wait-for": { type: "string" },
      scheme: { type: "string" },
      settle: { type: "string", default: "500" },
      help: { type: "boolean" },
    },
  });
  if (values.help || positionals.length !== 1) {
    console.error(USAGE);
    process.exit(values.help ? 0 : 2);
  }
  const url = positionals[0];
  const tokens = [values.style && styleTokens(values.style), values.tokens && readTokens(values.tokens)].filter(Boolean);
  const tokenSource = [values.style && `style ${values.style}`, values.tokens].filter(Boolean).join(" and ");
  const prep = values.prep ? (await import(pathToFileURL(resolve(values.prep)).href)).default : undefined;
  const widths = values.widths.split(",").map(Number);
  if (widths.some((w) => !Number.isInteger(w) || w <= 0)) throw new Error(`--widths must be positive integers: ${values.widths}`);

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    mkdirSync(values.out, { recursive: true });
    const target = reportName(url, values.prep);
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: +values.height }, colorScheme: values.scheme || "no-preference", reducedMotion: "reduce" });
      await page.goto(url, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      if (values["wait-for"]) await page.waitForSelector(values["wait-for"], { timeout: 60_000 });
      await page.waitForTimeout(+values.settle);
      const hidden = await fitScrollers(page);
      if (hidden) console.error(`${width}px: a scrolling region still hides ${hidden}px at a ${MAX_HEIGHT}px viewport; the capture and measurement miss it`);
      if (prep) await prep(page, width);
      const report = await audit(page, { tokens: tokens.length ? tokens : undefined, root: values.root, exclude: values.exclude, containers: values.containers, rows: true }).catch((err) => {
        throw new Error(/tokens:/.test(err.message) ? `${tokenSource}: ${err.message.replace(/^.*?tokens: /s, "")}` : err.message);
      });
      const base = join(values.out, `${target}-${width}`);
      writeFileSync(`${base}.json`, JSON.stringify(report, null, 1));
      await page.screenshot({ path: `${base}.png`, fullPage: true });
      await page.close();
      console.log(`${summary(report)}\n   report ${base}.json  capture ${base}.png\n`);
    }
  } finally {
    await browser.close();
  }
}

// Node resolves the entry module through symlinks, so compare real paths.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
