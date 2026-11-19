import { expect, it } from 'vitest'
import { compareJson, JSON_DIFF_MAX_LENGTH } from './json-diff'

it('ignores object key order at every depth', () => {
  expect(compareJson('{"a":[{"x":1,"y":2}],"b":null}', '{"b":null,"a":[{"y":2,"x":1}]}')).toEqual({
    success: true,
    changes: []
  })
})

it('reports nested additions, removals and replacements with both values', () => {
  expect(
    compareJson(
      '{"user":{"role":"viewer"},"debug":true}',
      '{"user":{"role":"admin","active":true}}'
    )
  ).toEqual({
    success: true,
    changes: [
      { kind: 'changed', path: '$.user.role', before: '"viewer"', after: '"admin"' },
      { kind: 'added', path: '$.user.active', after: 'true' },
      { kind: 'removed', path: '$.debug', before: 'true' }
    ]
  })
})

it('distinguishes missing fields from null and ignores inherited properties', () => {
  expect(
    compareJson('{"__proto__":{"x":1},"constructor":null}', '{"__proto__":{"x":2},"new":null}')
  ).toEqual({
    success: true,
    changes: [
      { kind: 'changed', path: '$.__proto__.x', before: '1', after: '2' },
      { kind: 'removed', path: '$.constructor', before: 'null' },
      { kind: 'added', path: '$.new', after: 'null' }
    ]
  })
})

it('escapes ambiguous field paths and compares arrays by position', () => {
  expect(compareJson('{"a.b":[1,2],"":0}', '{"a.b":[2,1,3],"":0}')).toEqual({
    success: true,
    changes: [
      { kind: 'changed', path: '$["a.b"][0]', before: '1', after: '2' },
      { kind: 'changed', path: '$["a.b"][1]', before: '2', after: '1' },
      { kind: 'added', path: '$["a.b"][2]', after: '3' }
    ]
  })
})

it.each([
  ['null', 'false'],
  ['[]', '{}'],
  ['1', '"1"'],
  ['" Hi "', '"hi"']
])('compares root types and values: %s vs %s', (a, b) => {
  expect(compareJson(a, b)).toEqual({
    success: true,
    changes: [{ kind: 'changed', path: '$', before: a, after: b }]
  })
})

it.each(['1', '1.0', '1e0'])('compares numeric values rather than formatting: %s', value => {
  expect(compareJson(value, '1')).toEqual({ success: true, changes: [] })
})

it.each(['9007199254740993', '1.0000000000000001', '1e400', '1e-400'])(
  'rejects numbers that would silently lose precision: %s',
  value => {
    expect(compareJson(value, value)).toEqual({ success: false, error: 'precision', side: 'A' })
  }
)

it('accepts safe large integers and high-precision numbers stored as strings', () => {
  const input = '{"id":9007199254740991,"text":"9007199254740993"}'
  expect(compareJson(input, input)).toEqual({ success: true, changes: [] })
})

it('identifies the invalid side, including empty input', () => {
  expect(compareJson('', '{}')).toEqual({ success: false, error: 'invalid', side: 'A' })
  expect(compareJson('{}', '{"oops":}')).toEqual({ success: false, error: 'invalid', side: 'B' })
})

it('bounds size, depth and nodes even if the inputs are identical', () => {
  const oversized = '"' + 'x'.repeat(JSON_DIFF_MAX_LENGTH) + '"'
  expect(compareJson(oversized, '{}')).toMatchObject({ error: 'size' })
  const deep = '['.repeat(129) + '0' + ']'.repeat(129)
  expect(compareJson(deep, deep)).toMatchObject({ error: 'depth' })
  const many = JSON.stringify(Array(100_001).fill(null))
  expect(compareJson(many, many)).toMatchObject({ error: 'nodes' })
})

it('returns an explicit error instead of a partial result beyond the change limit', () => {
  expect(
    compareJson(JSON.stringify(Array(5001).fill(0)), JSON.stringify(Array(5001).fill(1)))
  ).toEqual({ success: false, error: 'changes', side: 'both' })
})

it('bounds repeated long paths in the result', () => {
  const key = 'x'.repeat(30_000)
  expect(
    compareJson(
      JSON.stringify({ [key]: Array(80).fill(0) }),
      JSON.stringify({ [key]: Array(80).fill(1) })
    )
  ).toEqual({ success: false, error: 'output', side: 'both' })
})

it.each(['4e-324', '9e-324', '1.1e-323'])(
  'rejects rounded subnormal numbers instead of reporting equality: %s',
  value => {
    expect(compareJson(value, String(Number(value)))).toEqual({
      success: false,
      error: 'precision',
      side: 'A'
    })
  }
)

it.each([
  ['9007199254740991.0', '9007199254740991'],
  ['1.2345678901234567e0', '1.2345678901234567'],
  ['123456789012345670e-17', '1.2345678901234567'],
  ['5.0e-324', '5e-324'],
  ['-0.0', '0']
])('accepts equivalent supported decimal spellings: %s', (a, b) => {
  expect(compareJson(a, b)).toEqual({ success: true, changes: [] })
})

it.each([
  '{"a":1,"a":2}',
  '{"outer":{"a":1,"\\u0061":2}}',
  '{"items":[{"__proto__":1,"__proto__":2}]}',
  '{"a":0,"\\u0061":{"x":1}}'
])('rejects duplicate decoded keys before differences can be lost: %s', input => {
  expect(compareJson(input, '{}')).toEqual({ success: false, error: 'duplicate', side: 'A' })
  expect(compareJson('{}', input)).toEqual({ success: false, error: 'duplicate', side: 'B' })
})

it('allows the same key in separate objects and key-looking string values', () => {
  const input = JSON.stringify({ a: { a: 1 }, items: [{ a: 2 }, { a: 3 }], text: '"a":0' })
  expect(compareJson(input, input)).toEqual({ success: true, changes: [] })
})

it('checks long numeric mantissas without losing nonzero trailing digits', () => {
  const zeroes = '0'.repeat(40_000)
  expect(compareJson('1.' + zeroes, '1')).toEqual({ success: true, changes: [] })
  expect(compareJson('1.' + zeroes + '1', '1')).toEqual({
    success: false,
    error: 'precision',
    side: 'A'
  })
})

it('accepts size, depth, node and change limits exactly', () => {
  const largestString = JSON.stringify('x'.repeat(JSON_DIFF_MAX_LENGTH - 2))
  const deepest = '['.repeat(128) + '0' + ']'.repeat(128)
  const mostNodes = JSON.stringify(Array(99_999).fill(0))
  for (const input of [largestString, deepest, mostNodes]) {
    expect(compareJson(input, input)).toEqual({ success: true, changes: [] })
  }
  const result = compareJson(
    JSON.stringify(Array(5000).fill(0)),
    JSON.stringify(Array(5000).fill(1))
  )
  expect(result.success && result.changes.length).toBe(5000)
})

it('reports array removals and whole-subtree replacements without conflating null', () => {
  expect(
    compareJson('{"list":[null,false,0],"item":{"a":1}}', '{"list":[null],"item":[]}')
  ).toEqual({
    success: true,
    changes: [
      { kind: 'removed', path: '$.list[1]', before: 'false' },
      { kind: 'removed', path: '$.list[2]', before: '0' },
      { kind: 'changed', path: '$.item', before: '{"a":1}', after: '[]' }
    ]
  })
})

it('keeps empty, escaped and numeric object keys distinct from array indexes', () => {
  const keys = ['', '0', 'a.b', 'a[0]', 'a"b', 'a\\b', 'a\nb', '中文']
  const before = Object.fromEntries(keys.map(key => [key, 0]))
  const after = Object.fromEntries(keys.map(key => [key, 1]))
  expect(compareJson(JSON.stringify(before), JSON.stringify(after))).toEqual({
    success: true,
    changes: Object.keys(before).map(key => ({
      kind: 'changed',
      path: '$[' + JSON.stringify(key) + ']',
      before: '0',
      after: '1'
    }))
  })
})
