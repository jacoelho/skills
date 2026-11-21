import { execFile } from 'node:child_process'
import { mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'

import { audit, fitScrollers, loadPlaywright, reportName, styleTokens } from '../../skills/app-screen-design/scripts/audit.mjs'

// Run with: PW_DIR=<dir with playwright> node --test tests/app-screen-design/*.check.mjs
// Needs a browser to lay pages out, so it is not part of `claude plugin test`.

const AUDIT = new URL('../../skills/app-screen-design/scripts/audit.mjs', import.meta.url).pathname
const fixture = (name) => new URL(`fixtures/${name}`, import.meta.url).href
const TOKENS = { pad: 24, gap: 24, 'radius-card': 8, 'radius-control': 6, 'control-height': 32, 'fs-title': 24, 'fs-body': 14, 'fs-small': 12 }

let browser
before(async () => {
  browser = await loadPlaywright().chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
})
after(() => browser?.close())

async function measure(name, opts = {}, { width = 1440, css } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  try {
    await page.goto(fixture(name))
    if (css) await page.addStyleTag({ content: css })
    return await audit(page, opts)
  } finally {
    await page.close()
  }
}

async function measureHtml(html, opts = {}, { width = 1440 } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  try {
    await page.setContent(html)
    return await audit(page, opts)
  } finally {
    await page.close()
  }
}

const CARDS = `<style>body{margin:0;font:14px Arial;background:#f8f8f8} main{padding:24px;display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start} .card{background:#fff;border:1px solid #e6e6e6;border-radius:8px;padding:24px} input{height:32px;border:1px solid #d4d4d4;border-radius:6px;padding:0 8px;font:inherit;box-sizing:border-box}</style>`
const checks = (report) => report.findings.map((f) => `${f.check} ${f.where}`)

const rowFindings = (report) =>
  report.findings.filter((f) => f.check.startsWith('row-')).map((f) => ({ check: f.check, where: f.where, px: f.measured.px, line: f.measured.line, item: f.measured.item }))

describe('rows inside a container', () => {
  test('reports each planted sidebar miss once, including one in the filled active row', async () => {
    const report = await measure('sidebar.html')
    const rows = rowFindings(report)
    assert.deepEqual(
      rows.filter((r) => r.check !== 'row-vertical-centre'),
      [
        { check: 'row-label', where: 'Sidebar', px: 38, line: 36, item: 'Inbox' },
        { check: 'row-trailing', where: 'Sidebar', px: 15, line: 12, item: '[span.count]' },
        { check: 'row-leading', where: 'Sidebar', px: 15, line: 12, item: 'Workspace' },
      ],
    )
    const centre = rows.filter((r) => r.check === 'row-vertical-centre')
    assert.equal(centre.length, 1)
    assert.match(centre[0].item, /Views/)
    assert.ok(centre[0].px >= 2 && centre[0].px <= 3)
  })

  test('measures a nav and the sidebar around it as one container', async () => {
    const report = await measure('sidebar.html')
    assert.deepEqual(report.containers.map((c) => c.name), ['Sidebar'])
  })

  test('accepts a child indented one icon column and a full-width field on the box line', async () => {
    const report = await measure('sidebar.html', { rows: true })
    const [nav] = report.containers
    assert.equal(nav.lines.nestedLabel, 60)
    const search = nav.rows.find((r) => r.leftKind === 'box')
    assert.deepEqual([search.left, search.right, search.boxLabel], [8, 8, 12])
  })

  test('reports an avatar or a switch off the centre of its two-line text', async () => {
    const css = '.person:nth-child(2) .avatar { position: relative; top: 3px } [role=switch] { position: relative; top: -3px }'
    const rows = rowFindings(await measure('realistic.html', { tokens: TOKENS }, { css }))
    assert.deepEqual(rows.map((r) => [r.check, r.px, r.item]), [
      ['row-vertical-centre', 3, '[span.avatar] … Marta Alves'],
      ['row-vertical-centre', 3, 'Auto-remind … <span>'],
    ])
  })

  test('treats a box inset by its padding as on the box line, and a box on the text line as a miss', async () => {
    const rows = rowFindings(await measure('box-line.html'))
    assert.deepEqual(rows, [{ check: 'row-box-label', where: 'Box on text line', px: 24, line: 16, item: '[button]' }])
  })
})

describe('screen geometry', () => {
  test('finds nothing on a screen whose grid closes and whose values all map to tokens', async () => {
    const report = await measure('screen.html', { tokens: TOKENS })
    assert.deepEqual(report.findings, [])
    assert.deepEqual(report.edges.left.map((g) => g.px), [0])
    assert.deepEqual(report.edges.right.map((g) => g.px), [0])
    assert.deepEqual(report.gutters.map((g) => [g.px, g.token]), [[24, 'gap']])
  })

  test('reports a short card, and a gutter, inset and radius off their tokens', async () => {
    const report = await measure('drift.html', { tokens: TOKENS })
    const got = report.findings.map((f) => `${f.check} ${f.where} ${[f.measured].flat().map((m) => m.px).join('/')}`).sort()
    assert.deepEqual(got, ['band-row div.card 2', 'block-edge right 0/120', 'block-edge top 0/8', 'off-token card inset 22', 'off-token card radius 10', 'off-token gutter 16'])
  })

  test('measures the blocks inside a framed sheet that spans the canvas', async () => {
    const report = await measure('sheet.html', { tokens: { ...TOKENS, 'radius-sheet': 16 } })
    const got = report.findings.map((f) => `${f.check} ${f.where} ${[f.measured].flat().map((m) => m.px).join('/')}`).sort()
    assert.deepEqual(got, ['band-row div.card 2', 'block-edge right 0/120', 'block-edge top 0/8', 'off-token card inset 22', 'off-token card radius 10', 'off-token gutter 16'])
  })

  test('reports blocks in one band that stop on different top or bottom edges, counting a stack beside a tall card as one', async () => {
    const report = await measure('bands.html')
    const edges = report.findings.filter((f) => f.check === 'block-edge')
    assert.deepEqual(edges.map((f) => [f.where, f.measured.length]).sort(), [['bottom', 3], ['top', 2]])
    assert.deepEqual(edges.find((f) => f.where === 'top').measured.map((g) => g.px), [0, 8])
    assert.deepEqual(report.gutters.map((g) => g.px), [24])
  })

  test('reports a card whose rows sit lower than the same rows of the cards beside it, once per cause', async () => {
    const report = await measure('bands.html')
    const rows = report.findings.filter((f) => f.check === 'band-row')
    assert.deepEqual(rows.map((f) => [f.measured.text, f.measured.px, f.measured.row]), [['Margin', 4, 1]])
  })

  test('reports a blank band over 40px inside a stretched card', async () => {
    const report = await measure('bands.html')
    const holes = report.findings.filter((f) => f.check === 'hole')
    assert.deepEqual(holes.map((f) => f.where), ['Refunds'])
    assert.ok(holes[0].measured.px > 40)
  })

  test('measures sections divided only by rules', async () => {
    const report = await measure('ruled.html')
    assert.equal(report.meta.blocks, 3)
    assert.deepEqual(report.findings.filter((f) => f.check === 'block-edge').map((f) => f.measured.map((g) => g.px)), [[0, 120]])
  })

  test('measures the blocks inside a framed sheet whose title sits above it, and compares the title with the sheet', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      await page.goto(fixture('sheet.html'))
      await page.evaluate(() => {
        const h1 = document.querySelector('h1')
        h1.style.marginLeft = '8px'
        document.querySelector('main').prepend(h1)
      })
      const report = await audit(page, { tokens: { ...TOKENS, 'radius-sheet': 16 } })
      const got = report.findings.map((f) => `${f.check} ${f.where} ${[f.measured].flat().map((m) => m.px).join('/')}`).sort()
      assert.deepEqual(got, ['band-row div.card 2', 'block-edge left 0/8', 'block-edge right 0/120', 'block-edge top 0/8', 'off-token card inset 22', 'off-token card radius 10', 'off-token gutter 16'])
    } finally {
      await page.close()
    }
  })

  test('says gutters were not checked when a title sits above one block', async () => {
    const report = await measureHtml(`${CARDS}<style>main{display:block}</style><main><h1>Invoices</h1><div class="card"><p>a</p><p>b</p></div></main>`)
    assert.deepEqual(report.findings.map((f) => [f.check, f.measured.blocks]), [['not-measured', 1]])
  })

  test('says block edges were not checked when the canvas holds one block', async () => {
    const report = await measure('sidebar.html')
    assert.deepEqual(report.findings.filter((f) => f.check === 'not-measured').map((f) => f.measured.blocks), [1])
  })

  test('without tokens, reports a card and a control radius 2px apart, or a type scale, as nothing', async () => {
    const report = await measure('screen.html')
    assert.deepEqual(report.findings, [])
  })

  test('without tokens, reports values of one role 2-4px apart as drift, and mixed gutters', async () => {
    const report = await measure('drift.html')
    const got = report.findings.map((f) => `${f.check} ${f.where} ${[f.measured].flat().map((m) => m.px).join('/')}`).sort()
    assert.deepEqual(got, ['band-row div.card 2', 'block-edge right 0/120', 'block-edge top 0/8', 'drift card inset 22/24', 'drift card radius 8/10', 'gutter canvas 16/24'])
  })
})

describe('style tokens', () => {
  const slugs = [...readFileSync(new URL('../../skills/app-screen-design/references/styles.md', import.meta.url), 'utf8').matchAll(/^## .*\(`([a-z-]+)`\)/gm)].map((m) => m[1])

  test('every style in styles.md yields its spacing, radius, height and type tokens over the foundation', async () => {
    assert.ok(slugs.length > 0, 'no style headings found in styles.md')
    const page = await browser.newPage()
    try {
      await page.setContent('<main></main>')
      for (const slug of slugs) {
        const { meta } = await audit(page, { tokens: styleTokens(slug) })
        for (const name of ['pad', 'gap', 'gutter', 'radius-card', 'control-height', 'fs-body']) {
          assert.ok(Number.isFinite(meta.tokens[name]), `${slug}: ${name}`)
        }
      }
    } finally {
      await page.close()
    }
  })

  test('a style value overrides the foundation default', async () => {
    const page = await browser.newPage()
    try {
      await page.setContent('<main></main>')
      const { meta } = await audit(page, { tokens: styleTokens('achromatic-ledger') })
      assert.deepEqual([meta.tokens.pad, meta.tokens.gap, meta.tokens['control-height']], [24, 12, 36])
    } finally {
      await page.close()
    }
  })

  test('an unknown style names the known ones', () => {
    assert.throws(() => styleTokens('nope'), /unknown style nope; styles.md has achromatic-ledger, /)
  })
})

describe('independent references', () => {
  test("reports the four misses gridlines' README lists for its example sidebar", async () => {
    const rows = rowFindings(await measure('gridlines-sidebar.html'))
    assert.deepEqual(rows.filter((r) => r.check !== 'row-vertical-centre').map((r) => [r.check, r.px, r.line, r.item]), [
      ['row-trailing', 15, 12, '[span]'],
      ['row-leading', 15, 12, 'Workspace'],
      ['row-label', 38, 36, 'Views'],
    ])
    const centre = rows.filter((r) => r.check === 'row-vertical-centre')
    assert.equal(centre.length, 1)
    assert.ok(Math.abs(centre[0].px - 3) <= 1, `vertical-centre ${centre[0].px}`)
  })

  test('finds nothing on a screen built to achromatic-ledger, measured with --style', async () => {
    for (const width of [1440, 390]) {
      const report = await measure('realistic.html', { tokens: styleTokens('achromatic-ledger') }, { width })
      assert.deepEqual(report.findings.map((f) => f.message), [], `at ${width}px`)
    }
  })
})

describe('structure', () => {
  test('keeps reporting a filled active row when rows are 44px tall', async () => {
    const rows = rowFindings(await measure('sidebar.html', {}, { css: '.row { height: 44px }' }))
    assert.ok(rows.some((r) => r.check === 'row-label' && r.item === 'Inbox' && r.px === 38), JSON.stringify(rows))
  })

  test('compares rows outside a nav with the rows inside it, treats a bordered wrapper around an input as the field, reports a shifted icon once, and measures a clipped label by what shows', async () => {
    const rows = rowFindings(await measure('panels.html'))
    assert.deepEqual(rows.filter((r) => r.where === 'Sidebar').map((r) => [r.check, r.px, r.line, r.item]), [
      ['row-box-label', 15, 12, '[div]'],
      ['row-icon-column', 22, 20, '<svg>'],
    ])
    assert.deepEqual(rows.filter((r) => !['Sidebar', 'Indented rows'].includes(r.where)), [])
  })

  test('treats wrapped prose as ragged, not as trailing items, and a disclosure marker as the row start', async () => {
    const rows = rowFindings(await measure('panels.html'))
    assert.deepEqual(rows.filter((r) => r.where === 'Notes' || r.where === 'Verse'), [])
  })

  test('in a card, takes pad as the text line when a row sits on it, and reports rows off it as one finding', async () => {
    const report = await measure('panels.html', { tokens: TOKENS })
    const rows = report.findings.filter((f) => f.where === 'Indented rows')
    assert.deepEqual(rows.map((f) => [f.check, f.measured.px, f.measured.line, f.measured.rows]), [['row-leading', 32, 24, 3]])
  })

  test('accepts a row of actions aligned to the trailing line alone', async () => {
    const rows = rowFindings(await measure('panels.html'))
    assert.deepEqual(rows.filter((r) => r.where === 'Delete invoice'), [])
  })

  test('measures a card text line from inside its border and checks it against pad', async () => {
    const report = await measure('drift.html', { tokens: TOKENS })
    const card = report.containers.find((c) => c.name === 'div.card')
    assert.equal(card.lines.text, 24)
    assert.ok(report.findings.some((f) => f.check === 'off-token' && f.where === 'card inset' && f.measured.px === 22))
  })
})

describe('inputs and output', () => {
  test('a root selector that matches nothing is an error', async () => {
    await assert.rejects(measure('screen.html', { root: '#nope' }), /root #nope matched nothing/)
  })

  test('a page without main reports that it measured the body', async () => {
    const report = await measure('sidebar.html')
    assert.ok(report.findings.some((f) => f.check === 'root'), JSON.stringify(report.findings.map((f) => f.check)))
  })

  test('tells a 33px control from a 32px token, though ink positions keep a 1px tolerance', async () => {
    const report = await measure('screen.html', { tokens: TOKENS }, { css: '.wide button { height: 33px }' })
    assert.deepEqual(report.findings.map((f) => [f.check, f.where, f.measured.px]), [['off-token', 'control height', 33]])
  })

  test('maps a gutter to gap only, a radius to its role, and reports one finding per off-token value', async () => {
    const report = await measure('drift.html', { tokens: { ...TOKENS, gap: 12, pad: 24 } })
    assert.deepEqual(report.gutters.map((g) => [g.px, g.token]), [[16, null], [24, null]])
    const gutter = report.findings.filter((f) => f.where === 'gutter' || f.check === 'gutter')
    assert.deepEqual(gutter.map((f) => [f.check, f.measured.px]), [['off-token', 16], ['off-token', 24]])
  })

  test("draws a line one row holds as that row's own edge, and a line rows share as shared", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      await page.goto(fixture('gridlines-sidebar.html'))
      await audit(page)
      const drawn = await page.$$eval('[data-geometry-line]', (ds) => ds.map((d) => `${d.dataset.geometryLine} ${d.dataset.shared}`))
      assert.ok(drawn.includes('text true'), drawn.join(', '))
      assert.ok(drawn.includes('trailing false'), drawn.join(', '))
    } finally {
      await page.close()
    }
  })

  test('returns rows only on request', async () => {
    const lean = await measure('sidebar.html')
    assert.equal(lean.containers[0].rows, undefined)
    const full = await measure('sidebar.html', { rows: true })
    assert.ok(full.containers[0].rows.length > 0)
  })

  test('leaves out regions named by exclude', async () => {
    const report = await measure('sidebar.html', { exclude: 'nav' })
    assert.deepEqual(rowFindings(report), [])
  })

  test('each finding names a selector that finds its element', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      await page.goto(fixture('drift.html'))
      const report = await audit(page, { tokens: TOKENS })
      const edge = report.findings.find((f) => f.check === 'block-edge')
      const short = edge.measured.find((g) => g.px === 120)
      assert.equal(await page.locator(short.selectors[0]).count(), 1)
      assert.equal(await page.locator(short.selectors[0]).textContent().then((t) => t.includes('Alerts')), true)
    } finally {
      await page.close()
    }
  })

  test('the CLI reads a JSON tokens file and refuses one with no known token', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'geometry-'))
    const good = join(dir, 'good.json')
    writeFileSync(good, JSON.stringify(TOKENS))
    await promisify(execFile)(process.execPath, [AUDIT, fixture('screen.html'), '--out', dir, '--widths', '1440', '--tokens', good])
    const report = JSON.parse(readFileSync(join(dir, 'screen-html-1440.json'), 'utf8'))
    assert.deepEqual(report.findings, [])
    assert.equal(report.meta.tokens.pad, 24)
    const bad = join(dir, 'bad.json')
    writeFileSync(bad, JSON.stringify({ colour: '#fff', spacing: 4 }))
    await assert.rejects(
      promisify(execFile)(process.execPath, [AUDIT, fixture('screen.html'), '--out', dir, '--widths', '1440', '--tokens', bad]),
      (err) => /bad\.json: no known token among spacing/.test(err.stderr),
    )
  })
})

describe('page shapes', () => {
  test('takes a card inset from its text line, not from a button on the box line', async () => {
    const report = await measure('box-line.html', { tokens: { pad: 16, gap: 24 } })
    assert.deepEqual(report.census.cardInsets.map((g) => [g.px, g.count]), [[16, 2]])
    assert.deepEqual(checks(report).filter((c) => c.includes('inset')), [])
  })

  test('does not count a section gap holding a heading as a second gutter', async () => {
    const card = '<div class="card">a<br>b</div>'
    const html = `${CARDS}<style>main{grid-template-columns:repeat(3,1fr);row-gap:24px} .sec{grid-column:1/-1;margin:16px 0 0}</style><main>${card.repeat(3)}<h2 class="sec">Activity</h2>${card.repeat(3)}</main>`
    assert.deepEqual((await measureHtml(html, { tokens: TOKENS })).findings, [])
    assert.deepEqual((await measureHtml(html)).gutters.map((g) => g.px), [24])
  })

  test('reports a hole inside a full-height wrapper that holds only a badge', async () => {
    const html = `${CARDS}<style>main{align-items:stretch} .side{display:flex;flex-direction:column} .fill{flex:1} .badge{background:#eef;padding:2px 6px}</style><main><div class="card">${'<p>Row</p>'.repeat(10)}</div><div class="card side"><p>Refunds</p><div class="fill"><span class="badge">None</span></div></div></main>`
    assert.deepEqual(checks(await measureHtml(html)).filter((c) => c.startsWith('hole')), ['hole div.card'])
  })

  test('counts an excluded region, painted bars and a background image as content, not as a hole', async () => {
    const other = '<div class="card"><p>Other</p><p>x</p></div>'
    const cal = `<div class="card"><p>Bookings</p><div class="cal">${Array.from({ length: 28 }, (_, i) => `<div>${i + 1}</div>`).join('')}</div><p>28 days</p></div>`
    const bars = '<div class="card"><p>Orders by day</p><div class="bars"><i style="height:60%"></i><i style="height:80%"></i><i style="height:40%"></i></div><p>Mon to Wed</p></div>'
    const art = '<div class="card"><p>Welcome</p><div style="height:160px;background:url(data:image/gif;base64,R0lGODlhAQABAAAAACw=) center/cover"></div><p>Start here</p></div>'
    const style = '<style>.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px} .cal div{height:40px} .bars{display:flex;align-items:end;gap:8px;height:160px} .bars i{display:block;width:24px;background:#1d5fbf}</style>'
    for (const [card, opts] of [[cal, { exclude: '.cal' }], [bars, {}], [art, {}]]) {
      const report = await measureHtml(`${CARDS}${style}<main>${card}${other}</main>`, opts)
      assert.deepEqual(checks(report).filter((c) => c.startsWith('hole')), [], card.slice(0, 60))
    }
  })

  test('measures the bordered wrapper of an input as the control, and leaves a textarea out of control heights', async () => {
    const html = `${CARDS}<main><div class="card"><p>Search</p><div style="display:flex;height:32px;box-sizing:border-box;border:1px solid #d4d4d4;border-radius:6px;padding:0 8px;align-items:center"><input style="border:0;height:auto;padding:0;outline:0"></div></div><div class="card"><p>Notes</p><textarea style="display:block;height:96px;width:100%;border-radius:6px"></textarea></div></main>`
    const report = await measureHtml(html, { tokens: TOKENS })
    assert.deepEqual(report.census.controlHeights.map((g) => g.px), [32])
    assert.deepEqual(checks(report).filter((c) => c.includes('control')), [])
  })

  test('counts font sizes without checking them against the fs tokens', async () => {
    const html = `${CARDS}<main><div class="card"><p>Revenue</p><p style="font-size:32px">€42k</p><p style="font-size:18px">€9k refunds</p></div><div class="card"><p>Orders</p><p>x</p></div></main>`
    const report = await measureHtml(html, { tokens: styleTokens('achromatic-ledger') })
    assert.deepEqual(checks(report).filter((c) => c.includes('font')), [])
    assert.ok(report.census.fontSizes.some((g) => g.px === 18))
  })

  test('does not hold a short field alone on its row to the trailing line', async () => {
    const html = `${CARDS}<main><div class="card"><div>Company name</div><input style="width:240px;margin-left:-9px" value="Acme"><div>Shown on invoices</div></div><div class="card"><div>B</div><div>c</div></div></main>`
    assert.deepEqual(rowFindings(await measureHtml(html, { tokens: TOKENS })), [])
  })

  test('does not treat a wrapper with only transparent shadows as a surface', async () => {
    const html = '<style>body{margin:0;font:14px Arial} main{padding:24px} .x{box-shadow:0 0 #0000, 0 0 #0000;width:400px;height:60px}</style><main><div class="x">A</div><div class="x">B</div></main>'
    const report = await measureHtml(html)
    assert.equal(report.meta.blocks, 0)
    assert.deepEqual(report.census.shadows, [])
  })

  test('reads rem tokens against the root font size and refuses a token in another unit', async () => {
    assert.deepEqual((await measure('screen.html', { tokens: { ...TOKENS, pad: '1.5rem', gap: '1.5rem', 'radius-card': '0.5rem' } })).findings, [])
    assert.equal((await measure('screen.html', { tokens: 'pad: 1.5rem\ngap: 24px' })).meta.tokens.pad, 24)
    await assert.rejects(measure('screen.html', { tokens: { pad: '2em', gap: 24 } }), /pad: 2em/)
  })

  test('reports two cards whose matching rows disagree, and not two unlike cards', async () => {
    const kpi = (pad, label) => `<div class="card" style="padding-top:${pad}px"><div>${label}</div><div style="font-size:30px">1</div></div>`
    const alike = await measureHtml(`${CARDS}<main>${kpi(24, 'Revenue')}${kpi(32, 'Orders')}</main>`)
    assert.deepEqual(alike.findings.filter((f) => f.check === 'band-row').map((f) => Math.abs(f.measured.px)), [8])
    const unlike = await measureHtml(`${CARDS}<main>${kpi(24, 'Revenue')}<div class="card" style="padding-top:32px"><div>Orders</div><div style="font-size:30px">1</div><div>12 refunded</div></div></main>`)
    assert.deepEqual(unlike.findings.filter((f) => f.check === 'band-row'), [])
    const chart = await measureHtml(`${CARDS}<main><div class="card"><div>Orders</div><div style="height:160px;background:#eef"></div><div>Mon to Wed</div></div><div class="card"><div>Other</div><div>x</div></div></main>`)
    assert.deepEqual(chart.findings.filter((f) => f.check === 'band-row'), [])
  })

  test('measures a plain sidebar beside main as a container', async () => {
    const html = '<style>body{margin:0;font:14px Arial;display:flex} .side{width:240px;border-right:1px solid #e6e6e6;padding:8px 0} .row{display:flex;gap:8px;align-items:center;height:32px;padding:0 12px} main{flex:1;padding:24px}</style><div class="side"><div class="row"><svg width="16" height="16"><rect width="16" height="16"/></svg><span>Inbox</span></div><div class="row"><svg width="16" height="16"><rect width="16" height="16"/></svg><span>Sent</span></div><div class="row"><svg width="16" height="16"><rect width="16" height="16"/></svg><span style="margin-left:4px">Drafts</span></div></div><main><div>Hi</div></main>'
    const rows = rowFindings(await measureHtml(html))
    assert.deepEqual(rows.map((r) => [r.check, r.item]), [['row-label', 'Drafts']])
  })

  test('reports text that no container holds, once per region', async () => {
    const html = '<style>body{margin:0;font:14px Arial}</style><div class="top"><p>Acme</p><p>Billing</p></div><div class="body"><p>Text</p></div>'
    const report = await measureHtml(html)
    assert.deepEqual(report.findings.filter((f) => f.check === 'not-measured' && f.measured.text).map((f) => f.measured.selector), ['body > div:nth-of-type(1)', 'body > div:nth-of-type(2)'])
  })

  test('adds containers named by the containers option to the landmarks', async () => {
    const html = '<style>body{margin:0;font:14px Arial}</style><main><nav><p>Home</p></nav><div class="extra"><p>Extra</p><p>More</p></div></main>'
    const report = await measureHtml(html, { root: 'body', containers: '.extra' })
    assert.deepEqual(report.containers.map((c) => c.name).sort(), ['div.extra', 'main'])
  })

  test('compares a title with the one card below it, and checks that card', async () => {
    const html = `${CARDS}<style>main{display:block} h1{margin:0 0 24px 8px;font-size:24px} .bar{border-bottom:1px solid #e6e6e6;height:48px} table{width:100%}</style><main><h1>Invoices</h1><div class="card"><div class="bar">Filter</div><table><tr><td>INV-1</td></tr><tr><td>INV-2</td></tr></table></div></main>`
    const report = await measureHtml(html, { tokens: TOKENS })
    assert.deepEqual(report.findings.filter((f) => f.check === 'block-edge').map((f) => f.where), ['left'])
    assert.equal(report.census.cardInsets.length, 1)
  })

  test('reports a text row on the box line', async () => {
    const html = `${CARDS}<style>button{display:block;height:32px;margin-left:-8px;padding:0 7px;border:1px solid #d4d4d4;border-radius:6px;background:#fff;font:inherit}</style><main><div class="card"><div>Plan</div><div>Seats</div><button>Change plan</button><div style="margin-left:-8px">Billed yearly</div></div><div class="card"><div>B</div><div>c</div></div></main>`
    assert.deepEqual(rowFindings(await measureHtml(html, { tokens: TOKENS })).map((r) => [r.check, r.item]), [['row-leading', 'Billed yearly']])
  })

  test('draws the overlay above an open modal dialog', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      await page.setContent(`${CARDS}<style>dialog{width:100vw;height:100vh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:#fff}</style><main><div class="card"><p>A</p></div><div class="card"><p>B</p></div></main><dialog><p>Confirm</p></dialog>`)
      await page.evaluate(() => document.querySelector('dialog').showModal())
      await audit(page)
      const line = await page.locator('[data-geometry-line="edge"]').first().boundingBox()
      const clip = { x: line.x - 2, y: 400, width: 5, height: 5 }
      const drawn = await page.screenshot({ clip })
      await page.evaluate(() => (document.querySelector('[data-geometry-overlay]').style.visibility = 'hidden'))
      assert.ok(!drawn.equals(await page.screenshot({ clip })), 'the line is hidden under the dialog')
    } finally {
      await page.close()
    }
  })

  test('grows the viewport until a scrolling main shows all its content', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      await page.setContent('<style>body{margin:0;display:flex;height:100vh} main{flex:1;overflow:auto} .tall{height:2400px}</style><main><div class="tall">x</div></main>')
      await fitScrollers(page)
      const { scroll, client } = await page.evaluate(() => ({ scroll: document.querySelector('main').scrollHeight, client: document.querySelector('main').clientHeight }))
      assert.equal(scroll, client)
    } finally {
      await page.close()
    }
  })

  test('leaves the viewport alone when only the document scrolls', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      await page.setContent('<!doctype html><style>html{overflow-y:scroll} body{margin:0} .tall{height:2400px}</style><main><div class="tall">x</div></main>')
      await fitScrollers(page)
      assert.deepEqual(page.viewportSize(), { width: 1440, height: 900 })
    } finally {
      await page.close()
    }
  })

  test('audits a page whose Content-Security-Policy forbids inline scripts', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      await page.route('http://csp.test/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', headers: { 'content-security-policy': "script-src 'self'" }, body: `${CARDS}<main><div class="card">A</div><div class="card">B</div></main>` }))
      await page.goto('http://csp.test/')
      assert.equal((await audit(page)).meta.blocks, 2)
    } finally {
      await page.close()
    }
  })

  test('names reports apart for each route, query, folder and prep script', () => {
    const names = [
      reportName('http://localhost:3000/'),
      reportName('http://localhost:3000/?tab=2'),
      reportName('http://localhost:3000/#/billing'),
      reportName('http://localhost:3000/', 'scripts/open-menu.mjs'),
      reportName('file:///a/index.html'),
      reportName('file:///b/index.html'),
    ]
    assert.equal(new Set(names).size, names.length, names.join(', '))
    assert.equal(reportName('file:///x/fixtures/screen.html'), 'screen-html')
  })

  test('the CLI runs through a symlinked folder', async () => {
    const link = join(mkdtempSync(join(tmpdir(), 'geometry-')), 'scripts')
    symlinkSync(dirname(AUDIT), link)
    const { stderr } = await promisify(execFile)(process.execPath, [join(link, 'audit.mjs'), '--help'])
    assert.match(stderr, /usage: node audit\.mjs/)
  })
})
