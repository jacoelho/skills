// Labelled comments for calibrating the judge: `flag` when the policy says the
// comment should not stay as written, `keep` otherwise. Each case is one comment
// on `line` (1-based) of `source`.
export type Case = { name: string; path: string; language: string; source: string; line: number; expected: 'flag' | 'keep' }

export const CASES: Case[] = [
  {
    name: 'restates an increment',
    path: 'counter.go',
    language: 'go',
    source: 'package counter\n\nfunc (c *C) Add() {\n\t// increment the counter\n\tc.n++\n}\n',
    line: 4,
    expected: 'flag',
  },
  {
    name: 'restates a loop',
    path: 'sum.py',
    language: 'python',
    source: 'def total(items):\n    t = 0\n    # loop over the items and add each price\n    for item in items:\n        t += item.price\n    return t\n',
    line: 3,
    expected: 'flag',
  },
  {
    name: 'narrates history',
    path: 'cache.ts',
    language: 'typescript',
    source: 'export async function load(id: string) {\n  // Now uses the cache instead of the database.\n  return cache.get(id)\n}\n',
    line: 2,
    expected: 'flag',
  },
  {
    name: 'commented-out code',
    path: 'main.go',
    language: 'go',
    source: 'package main\n\nfunc main() {\n\t// fmt.Println("debug", x)\n\trun()\n}\n',
    line: 4,
    expected: 'flag',
  },
  {
    name: 'states a blank-line constraint the code enforces',
    path: 'spec.py',
    language: 'python',
    source: 'def insert(lines, at, entry):\n    while at > 0 and not lines[at - 1].strip():\n        at -= 1\n    # Insert after the section\'s last text line, keeping exactly one blank line on each side.\n    lines[at:at] = ["", *entry, ""]\n',
    line: 4,
    expected: 'keep',
  },
  {
    name: 'explains why an obvious alternative is wrong',
    path: 'sort.go',
    language: 'go',
    source: 'package sort\n\nfunc Stable(xs []Item) {\n\t// sort.Slice is not stable, and equal keys must keep their input order.\n\tsort.SliceStable(xs, less)\n}\n',
    line: 4,
    expected: 'keep',
  },
  {
    name: 'states a concurrency invariant',
    path: 'pool.rs',
    language: 'rust',
    source: 'fn release(&self, conn: Conn) {\n    // Only the owning worker returns a connection; the pool never locks here.\n    self.free.push(conn);\n}\n',
    line: 2,
    expected: 'keep',
  },
  {
    name: 'cites an upstream bug for a workaround',
    path: 'fetch.ts',
    language: 'typescript',
    source: 'export function get(url: string) {\n  // Node 22 drops the body on a 303 redirect (nodejs/undici#3412), so redirects are followed by hand.\n  return fetch(url, { redirect: \'manual\' })\n}\n',
    line: 2,
    expected: 'keep',
  },
  {
    name: 'names a unit the type does not carry',
    path: 'timeout.py',
    language: 'python',
    source: 'class Client:\n    def __init__(self, timeout):\n        self.timeout = timeout  # seconds, as the server expects\n',
    line: 3,
    expected: 'keep',
  },
  {
    name: 'restates a field name',
    path: 'rig.ts',
    language: 'typescript',
    source: 'type Rig = {\n  // The tree the next snapshot writes.\n  tree: { value: string }\n}\n',
    line: 2,
    expected: 'flag',
  },
]
