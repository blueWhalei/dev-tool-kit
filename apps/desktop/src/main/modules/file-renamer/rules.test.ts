// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { generatePreviews } from './rules'
const file = {
  name: 'hello123.txt',
  path: '/hello123.txt',
  size: 0,
  isDirectory: false,
  modifiedTime: ''
}
describe('rename rules', () => {
  it('preserves extensions and applies capture groups and rule chains', () => {
    const [result] = generatePreviews(
      [file],
      [
        { type: 'regex', pattern: '(hello)(123)', replaceWith: '$2_$1' },
        { type: 'prefix', value: 'x_' }
      ]
    )
    expect(result.preview).toBe('x_123_hello.txt')
    expect(result.conflict).toBeUndefined()
  })
  it('invalid regex blocks execution instead of silently keeping the name', () => {
    expect(generatePreviews([file], [{ type: 'regex', pattern: '[' }])[0].conflict).toBe(
      'invalidRegex'
    )
  })
  it('validates numbering bounds', () => {
    expect(generatePreviews([file], [{ type: 'number', startNumber: 0 }])[0].conflict).toBe(
      'invalidRule'
    )
    expect(generatePreviews([file], [{ type: 'number', padding: 11 }])[0].conflict).toBe(
      'invalidRule'
    )
    expect(
      generatePreviews([file], [{ type: 'number', startNumber: 2, padding: 2 }])[0].preview
    ).toBe('02_hello123.txt')
  })
})

it.each([
  '{"type":"number","startNumber":1}',
  '[{"type":"number","startNumber":"2","padding":3}]',
  '[{"type":"number","startNumber":2,"padding":"3"}]'
])('rejects non-current rule input: %s', json => {
  const input: import('@dev-tool-kit/shared').RenameRule[] = JSON.parse(json)
  expect(generatePreviews([file], input)[0].conflict).toBe('invalidRule')
})
