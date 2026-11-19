import { parseJsonValue } from './json-schema'

export interface JsonChange {
  kind: 'added' | 'removed' | 'changed'
  path: string
  before?: string
  after?: string
}

export type JsonDiffError =
  | 'invalid'
  | 'size'
  | 'depth'
  | 'nodes'
  | 'precision'
  | 'duplicate'
  | 'changes'
  | 'output'
export type JsonDiffResult =
  | { success: true; changes: JsonChange[] }
  | { success: false; error: JsonDiffError; side: 'A' | 'B' | 'both' }

export const JSON_DIFF_MAX_LENGTH = 512 * 1024
const MAX_DEPTH = 128
const MAX_NODES = 100_000
const MAX_CHANGES = 5_000
const MAX_OUTPUT_LENGTH = 2 * 1024 * 1024

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
type ParsedJson = { value: JsonValue } | { error: JsonDiffError }

// Normalize decimal spelling without going through Number, so rounding stays detectable.
function normalizeNumber(token: string): string {
  const [mantissa, exponent = '0'] = token.toLowerCase().split('e')
  const decimalPoint = mantissa.indexOf('.')
  const fractionalDigits = decimalPoint < 0 ? 0 : mantissa.length - decimalPoint - 1
  const digits = mantissa.replace('.', '')
  const negative = digits.startsWith('-')
  let start = negative ? 1 : 0
  let end = digits.length
  while (start < end && digits[start] === '0') start++
  while (end > start && digits[end - 1] === '0') end--
  if (start === end) return '0'
  const decimalExponent = Number(exponent) - fractionalDigits + digits.length - end
  return (negative ? '-' : '') + digits.slice(start, end) + 'e' + decimalExponent
}

function parseInput(text: string): ParsedJson {
  if (text.length > JSON_DIFF_MAX_LENGTH) return { error: 'size' }
  const parsed = parseJsonValue(text)
  if (!parsed.success) return { error: 'invalid' }

  const value = parsed.result as JsonValue // JSON.parse has already validated the input.
  const pending = [{ value, depth: 0 }]
  let nodes = 1
  while (pending.length) {
    const current = pending.pop()!
    if (current.depth > MAX_DEPTH) return { error: 'depth' }
    if (current.value !== null && typeof current.value === 'object') {
      for (const child of Object.values(current.value)) {
        if (++nodes > MAX_NODES) return { error: 'nodes' }
        pending.push({ value: child, depth: current.depth + 1 })
      }
    }
  }

  // Inspect validated source: JSON.parse has already rounded numbers and discarded duplicate keys.
  const objects: Set<string>[] = []
  let previousString = ''
  const tokens = text.matchAll(/"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}:]/g)
  for (const [token] of tokens) {
    if (token === '{') {
      objects.push(new Set())
    } else if (token === '}') {
      objects.pop()
    } else if (token === ':') {
      const key = JSON.parse(previousString) as string
      const keys = objects[objects.length - 1]
      if (keys.has(key)) return { error: 'duplicate' }
      keys.add(key)
    } else if (token.startsWith('"')) {
      previousString = token
    } else {
      const number = Number(token)
      if (
        !Number.isFinite(number) ||
        (Number.isInteger(number) && !Number.isSafeInteger(number)) ||
        normalizeNumber(token) !== normalizeNumber(String(number))
      ) {
        return { error: 'precision' }
      }
    }
  }
  return { value }
}

function childPath(path: string, key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? path + '.' + key : path + '[' + JSON.stringify(key) + ']'
}

export function compareJson(textA: string, textB: string): JsonDiffResult {
  const a = parseInput(textA)
  if ('error' in a) return { success: false, error: a.error, side: 'A' }
  const b = parseInput(textB)
  if ('error' in b) return { success: false, error: b.error, side: 'B' }
  const changes: JsonChange[] = []
  let overflow: JsonDiffError | undefined
  let outputLength = 0

  function visit(before: JsonValue | undefined, after: JsonValue | undefined, path: string): void {
    if (overflow || before === after) return
    if (
      before !== null &&
      after !== null &&
      typeof before === 'object' &&
      typeof after === 'object' &&
      Array.isArray(before) === Array.isArray(after)
    ) {
      if (Array.isArray(before) && Array.isArray(after)) {
        for (let index = 0; index < Math.max(before.length, after.length) && !overflow; index++) {
          visit(before[index], after[index], path + '[' + index + ']')
        }
      } else {
        const oldObject = before as Record<string, JsonValue>
        const newObject = after as Record<string, JsonValue>
        const keys = new Set([...Object.keys(oldObject), ...Object.keys(newObject)])
        for (const key of keys) {
          visit(
            Object.hasOwn(oldObject, key) ? oldObject[key] : undefined,
            Object.hasOwn(newObject, key) ? newObject[key] : undefined,
            childPath(path, key)
          )
          if (overflow) break
        }
      }
      return
    }
    if (changes.length === MAX_CHANGES) {
      overflow = 'changes'
      return
    }
    const change: JsonChange = {
      kind: before === undefined ? 'added' : after === undefined ? 'removed' : 'changed',
      path,
      ...(before === undefined ? {} : { before: JSON.stringify(before) }),
      ...(after === undefined ? {} : { after: JSON.stringify(after) })
    }
    outputLength += path.length + (change.before?.length ?? 0) + (change.after?.length ?? 0)
    if (outputLength > MAX_OUTPUT_LENGTH) {
      overflow = 'output'
      return
    }
    changes.push(change)
  }
  visit(a.value, b.value, '$')
  return overflow ? { success: false, error: overflow, side: 'both' } : { success: true, changes }
}
