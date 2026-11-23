import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'

// Run with: node --test tests/change-overview/*.check.mjs
// The dot-to-svg cases need Graphviz and are skipped without it.

const script = (name) => new URL(`../../skills/change-overview/scripts/${name}`, import.meta.url).pathname
const dir = mkdtempSync(join(tmpdir(), 'change-overview-'))
after(() => rmSync(dir, { recursive: true, force: true }))

const write = (name, text) => {
  const file = join(dir, name)
  writeFileSync(file, text)
  return file
}
const run = (command, args, input) => spawnSync(command, args, { encoding: 'utf8', input, cwd: dir })

describe('render-diff', () => {
  const render = (oldFile, newFile, extra = []) =>
    run('node', [script('render-diff.mjs'), '--repo', 'https://github.com/o/r/', '--sha', 'abc1234', '--path', 'pkg/a.go', '--line', '7', ...extra, oldFile, newFile])
  const rows = (html) => [...html.matchAll(/<span class="l (add|del|ctx)"[^>]*><span class="m"[^>]*>.<\/span>(.*?)<\/span>/g)].map(([, kind, text]) => `${kind} ${text}`)

  test('a changed line is one removed and one added row between unchanged rows', () => {
    const result = render(write('old1', 'alpha\nbeta\ngamma\n'), write('new1', 'alpha\nBETA\ngamma\n'))
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(rows(result.stdout), ['ctx alpha', 'del beta', 'add BETA', 'ctx gamma'])
    assert.match(result.stdout, /data-added="1" data-removed="1"/)
  })

  test('new code is all added and deleted code all removed', () => {
    const code = write('code', 'one\ntwo\nthree\n')
    const added = render('-', code)
    assert.deepEqual(rows(added.stdout), ['add one', 'add two', 'add three'])
    assert.match(added.stdout, /data-added="3" data-removed="0"/)
    const removed = render(code, '-')
    assert.deepEqual(rows(removed.stdout), ['del one', 'del two', 'del three'])
    assert.match(removed.stdout, /data-added="0" data-removed="3"/)
  })

  test('a re-indented line is unchanged', () => {
    const result = render(write('old2', 'if x {\n\tcall()\n}\n'), write('new2', 'if x {\n\t\tcall()\n}\n'))
    assert.match(result.stdout, /data-added="0" data-removed="0"/)
  })

  test('code and caption are escaped and the caption links path and line at the commit', () => {
    const result = render('-', write('html', 'if a < b && c > "d" {}\n'), ['--title', 'x < y'])
    assert.ok(!result.stdout.includes('a < b'), result.stdout)
    assert.match(result.stdout, /if a &lt; b &amp;&amp; c &gt; &quot;d&quot; \{\}/)
    assert.match(result.stdout, /<figcaption>x &lt; y <a class="cite" href="https:\/\/github.com\/o\/r\/blob\/abc1234\/pkg\/a.go#L7" data-path="pkg\/a.go" data-line="7" data-sha="abc1234">pkg\/a.go:7<\/a>/)
  })

  test('a malformed commit or line number is a usage error', () => {
    const code = write('code2', 'x\n')
    for (const [flag, value] of [['--sha', 'main'], ['--line', '0']]) {
      const args = [script('render-diff.mjs'), '--repo', 'r', '--sha', 'abc1234', '--path', 'p', '--line', '1', '-', code]
      args[args.indexOf(flag) + 1] = value
      const result = run('node', args)
      assert.equal(result.status, 2, `${flag} ${value}: ${result.stdout}`)
      assert.equal(result.stdout, '')
    }
  })
})

describe('check-page', () => {
  let repo, base, head
  before(() => {
    repo = join(dir, 'repo')
    const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()
    execFileSync('git', ['init', '-q', repo])
    git('config', 'user.email', 'test@example.invalid')
    git('config', 'user.name', 'test')
    writeFileSync(join(repo, 'a.go'), 'package a\n\nfunc A() {}\n')
    git('add', '.')
    git('commit', '-qm', 'base')
    base = git('rev-parse', 'HEAD')
    writeFileSync(join(repo, 'a.go'), '// Package a is a test fixture.\n\nfunc A() {}\n\nfunc B() {}\n')
    git('commit', '-qam', 'head')
    head = git('rev-parse', 'HEAD')
  })

  const cite = (file, line, sha) => `<a class="cite" href="#" data-path="${file}" data-line="${line}" data-sha="${sha}">${file}:${line}</a>`
  const page = ({ body = '', figures = '' } = {}) => `<!DOCTYPE html><html><body><main data-head="${head}" data-base="${base}">
<p>${cite('a.go', 5, head)} ${cite('a.go', 3, base)}</p>
<div class="author-claim" data-status="confirmed"><q>claim</q><p>evidence</p></div>
<figure class="code" data-added="3" data-removed="2"></figure>
<figure class="diagram"><svg></svg><figcaption>What calls what</figcaption></figure>
${figures}${body}</main></body></html>`
  const check = (html, extra = []) => run('node', [script('check-page.mjs'), write(`page-${Math.random()}.html`, html), '--repo-dir', repo, ...extra])

  test('a page whose citations exist at the head and the merge base passes', () => {
    const result = check(page())
    assert.equal(result.status, 0, result.stdout)
    assert.match(result.stdout, /^2 citations, 1 author claims, 5 shown changed lines$/m)
  })

  test('--print-cites prints the cited line', () => {
    const result = check(page(), ['--print-cites'])
    assert.match(result.stdout, new RegExp(`^${head.slice(0, 7)} a.go:5 \\| func B\\(\\) \\{\\}$`, 'm'))
  })

  test('--print-cites marks a cited comment line and leaves code unmarked', () => {
    const result = check(page({ body: cite('a.go', 1, head) }), ['--print-cites'])
    assert.match(result.stdout, new RegExp(`^${head.slice(0, 7)} a.go:5 \\| func B`, 'm'))
    assert.match(result.stdout, new RegExp(`^${head.slice(0, 7)} a.go:1 \\| \\(comment\\) // Package a`, 'm'))
  })

  for (const [name, html, problem] of [
    ['a line past the end of the file', () => page({ body: cite('a.go', 4, base) }), /a\.go:4 is past the end of the file/],
    ['a commit that is neither head nor merge base', () => page({ body: cite('a.go', 1, '0'.repeat(40)) }), /cites 0{40}, neither the head nor the merge base/],
    ['a file missing at the commit', () => page({ body: cite('b.go', 1, head) }), /b\.go does not exist at/],
    ['an author claim with an unknown status', () => page({ body: '<div class="author-claim" data-status="probably"></div>' }), /author claim with status probably/],
    ['an author claim without a status', () => page({ body: '<div class="author-claim"></div>' }), /author claim with status missing/],
    ['a template slot left unfilled', () => page({ body: '{{coverage}}' }), /unfilled template slot \{\{coverage\}\}/],
    ['a diagram without a caption', () => page({ figures: '<figure class="diagram"><svg></svg></figure>' }), /a diagram has no caption/],
    ['a code figure without counts', () => page({ figures: '<figure class="code"></figure>' }), /code figure without data-added and data-removed/],
    ['a script loaded from elsewhere', () => page({ body: '<script src="https://cdn.example/x.js"></script>' }), /loads a script from elsewhere/],
  ]) {
    test(`fails on ${name}`, () => {
      const result = check(html())
      assert.equal(result.status, 1, result.stdout)
      assert.match(result.stdout, problem)
      assert.equal(result.stdout.match(/^problem:/gm).length, 1, result.stdout)
    })
  }

  test('the shown-lines budget allows exactly the limit and fails one above it', () => {
    assert.equal(check(page(), ['--max-shown', '5']).status, 0)
    const over = check(page(), ['--max-shown', '4'])
    assert.equal(over.status, 1)
    assert.match(over.stdout, /shows 5 changed lines, more than 4/)
  })
})

describe('dot-to-svg', { skip: spawnSync('dot', ['-V']).status !== 0 && 'Graphviz is not installed' }, () => {
  const render = (...files) => run('node', [script('dot-to-svg.mjs'), ...files])
  const svg = (name) => readFileSync(join(dir, `${name}.svg`), 'utf8')
  const placed = (text) => Object.fromEntries([...text.matchAll(/<text\b[^>]*\bx="([\d.-]+)" y="([\d.-]+)"[^>]*>([a-z]+)<\/text>/g)].map(([, x, y, label]) => [label, `${x},${y}`]))
  const viewBox = (text) => text.match(/viewBox="([^"]*)"/)[1]
  const before = 'digraph { A [label="api"]; B [label="queue"]; C [label="store"]; A -> C [label="writes"]; }'
  const now = 'digraph { A [label="api"]; B [label="queue"]; C [label="store"]; A -> B [label="sends" class="added"]; B -> C [label="drains" class="added"]; D [label="cache" class="added"]; C -> D [class="added"]; }'

  test('draws one chart in currentColor at no more than its own size, without ids, titles or black', () => {
    const result = render(write('one.dot', 'digraph { A [label="api"]; B [label="store"]; A -> B [label="writes" class="added"] }'))
    assert.equal(result.status, 0, result.stderr)
    const out = svg('one')
    const width = Number(viewBox(out).split(' ')[2])
    assert.ok(out.startsWith(`<svg fill="currentColor" style="max-width:${Math.round(width * 4 / 3)}px"`), out.slice(0, 120))
    assert.doesNotMatch(out, /black|<title>| id="|<!--|<\?xml/)
    assert.match(out, /class="edge added"/)
    assert.match(out, />writes</)
  })

  test('charts drawn together keep every shared box in one place on one canvas', () => {
    write('solo-before.dot', before)
    write('solo-now.dot', now)
    assert.equal(render(join(dir, 'solo-before.dot')).status, 0)
    assert.equal(render(join(dir, 'solo-now.dot')).status, 0)
    assert.notEqual(placed(svg('solo-before')).queue, placed(svg('solo-now')).queue, 'separate layouts must move a box for this test to mean anything')

    const result = render(write('before.dot', before), write('now.dot', now))
    assert.equal(result.status, 0, result.stderr)
    const [b, n] = [svg('before'), svg('now')]
    for (const label of ['api', 'queue', 'store']) assert.equal(placed(b)[label], placed(n)[label], label)
    assert.equal(viewBox(b), viewBox(n))
    assert.ok(b.startsWith('<svg fill="currentColor"') && n.startsWith('<svg fill="currentColor"'))
  })

  test('each chart drawn together shows only its own edges and labels', () => {
    assert.equal(render(write('b2.dot', before), write('n2.dot', now)).status, 0)
    const [b, n] = [svg('b2'), svg('n2')]
    assert.equal(b.match(/class="edge/g).length, 1)
    assert.equal(n.match(/class="edge added"/g).length, 3)
    assert.match(b, />writes</)
    assert.doesNotMatch(b, />sends<|>drains</)
    assert.doesNotMatch(n, />writes</)
  })

  test('an edge in both charts drawn together is laid out once, so it keeps one unbent route', () => {
    const routeOf = (text, label) => text.match(new RegExp(`<g class="edge[^"]*">\\s*<path[^>]*\\bd="([^"]*)"(?:(?!</g>)[\\s\\S])*>${label}<`))?.[1]
    const shared = 'digraph { A [label="api"]; B [label="store"]; A -> B [label="keeps"]; }'
    const grown = 'digraph { A [label="api"]; B [label="store"]; C [label="cache"]; A -> B [label="keeps"]; B -> C [label="fills"]; }'
    assert.equal(render(write('r-before.dot', shared), write('r-now.dot', grown)).status, 0)
    const route = routeOf(svg('r-before'), 'keeps')
    assert.ok(route, svg('r-before'))
    assert.equal(routeOf(svg('r-now'), 'keeps'), route)
    const xs = [...route.matchAll(/([\d.-]+),[\d.-]+/g)].map(([, x]) => Number(x))
    assert.ok(Math.max(...xs) - Math.min(...xs) < 1, `a straight drop from api to store bends: ${route}`)
  })

  test('a box marked changed between charts drawn together keeps its place and its size, with room for either label', () => {
    const outline = (text, label) => text.match(new RegExp(`<g class="node[^"]*">\\s*<polygon[^>]*points="([^"]*)"(?:(?!</g>)[\\s\\S])*>${label}<`))?.[1]
    const width = (points) => { const xs = points.split(' ').map((p) => Number(p.split(',')[0])); return Math.max(...xs) - Math.min(...xs) }
    const short = 'digraph { node [shape=box]; A [label="api"]; B [label="db"]; A -> B; }'
    const long = 'digraph { node [shape=box]; A [label="api"]; B [label="primary relational database"]; A -> B; }'
    const marked = (text) => text.replace(/B \[label="([^"]*)"\]/, 'B [label="$1" class="changed"]')
    write('l-solo.dot', long)
    assert.equal(render(join(dir, 'l-solo.dot')).status, 0)
    const needed = width(outline(svg('l-solo'), 'primary relational database'))
    for (const [first, second, order] of [[long, short, 'long-first'], [short, long, 'short-first']]) {
      assert.equal(render(write(`${order}-before.dot`, first), write(`${order}-now.dot`, marked(second))).status, 0)
      const [b, n] = [svg(`${order}-before`), svg(`${order}-now`)].map((text) => outline(text, 'primary relational database') ?? outline(text, 'db'))
      assert.ok(b && n, order)
      assert.equal(b, n, order)
      assert.ok(width(b) >= needed - 0.5, `${order}: ${b} is narrower than the longer label needs`)
    }
  })

  for (const [name, files, message] of [
    ['invalid DOT', [['bad', 'digraph {']], /./],
    ['a cluster in charts drawn together', [['ok', before], ['clustered', 'digraph { subgraph cluster_x { A } }']], /clustered\.dot has a cluster/],
    ['a box relabelled without the changed mark', [['named', before], ['renamed', 'digraph { A [label="gateway"]; }']], /box A is labelled "api" in the first chart and "gateway" in chart 2; mark it class="changed" there/],
    ['a second chart that does not parse', [['first', before], ['broken', 'digraph { A -> }']], /./],
  ]) {
    test(`fails without writing any SVG on ${name}`, () => {
      const paths = files.map(([stem, text]) => write(`fail-${stem}.dot`, text))
      const result = render(...paths)
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, message)
      for (const path of paths) assert.ok(!existsSync(path.replace(/\.dot$/, '.svg')), `${path} produced an SVG`)
    })
  }

  test('a file that does not end in .dot is a usage error', () => {
    const result = render(write('chart.gv', before))
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /does not end in \.dot/)
  })
})
