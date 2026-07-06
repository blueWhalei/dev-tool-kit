import type { RegexMatch } from '../types'

export const REGEX_MAX_INPUT_LENGTH = 100_000
export const REGEX_MAX_MATCHES = 1000
export const VALID_REGEX_FLAGS_RE = /^[gimsuy]*$/

export interface RegexFlags {
  g?: boolean
  i?: boolean
  m?: boolean
  s?: boolean
}

export function buildFlagsString(flags: RegexFlags): string {
  let result = ''
  if (flags.g) result += 'g'
  if (flags.i) result += 'i'
  if (flags.m) result += 'm'
  if (flags.s) result += 's'
  return result
}

export function parseFlagsString(flags: string): RegexFlags {
  return {
    g: flags.includes('g'),
    i: flags.includes('i'),
    m: flags.includes('m'),
    s: flags.includes('s')
  }
}

export function isValidRegexFlags(flags: string): boolean {
  return VALID_REGEX_FLAGS_RE.test(flags)
}

export function validateRegexInput(text: string): string | null {
  if (text.length > REGEX_MAX_INPUT_LENGTH) {
    return `输入文本超过 ${REGEX_MAX_INPUT_LENGTH.toLocaleString()} 字符限制`
  }
  return null
}

export interface RegexExecResult {
  isValid: boolean
  matches: RegexMatch[]
  error?: string
}

export function findRegexMatches(
  pattern: string,
  flags: string,
  testString: string
): RegexExecResult {
  const inputError = validateRegexInput(testString)
  if (inputError) {
    return { isValid: false, matches: [], error: inputError }
  }
  if (!isValidRegexFlags(flags)) {
    return { isValid: false, matches: [], error: '无效的正则标志' }
  }

  try {
    const regex = new RegExp(pattern, flags)
    const matches: RegexMatch[] = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(testString)) !== null) {
      matches.push({
        match: match[0],
        index: match.index,
        groups: match.slice(1)
      })
      if (!flags.includes('g')) break
      if (matches.length >= REGEX_MAX_MATCHES) break
    }

    return { isValid: true, matches }
  } catch (error) {
    return {
      isValid: false,
      matches: [],
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export interface RegexReplaceResult {
  success: boolean
  result: string
  error?: string
}

export function applyRegexReplace(
  pattern: string,
  flags: string,
  testString: string,
  replacement: string
): RegexReplaceResult {
  const inputError = validateRegexInput(testString)
  if (inputError) {
    return { success: false, result: '', error: inputError }
  }
  if (!isValidRegexFlags(flags)) {
    return { success: false, result: '', error: '无效的正则标志' }
  }

  try {
    const regex = new RegExp(pattern, flags)
    const result = testString.replace(regex, replacement)
    return { success: true, result }
  } catch (error) {
    return {
      success: false,
      result: '',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export interface HighlightSegment {
  text: string
  kind: 'plain' | 'match' | 'group'
  groupIndex?: number
}

const GROUP_COLORS = [
  'var(--regex-group-1, #e8f5e9)',
  'var(--regex-group-2, #e3f2fd)',
  'var(--regex-group-3, #fff3e0)',
  'var(--regex-group-4, #fce4ec)'
]

export function getGroupHighlightColor(groupIndex: number): string {
  return GROUP_COLORS[groupIndex % GROUP_COLORS.length]
}

/** Build highlighted segments for the first match at each index (simple, non-overlapping). */
export function buildMatchHighlights(
  testString: string,
  matches: RegexMatch[]
): HighlightSegment[] {
  if (matches.length === 0) {
    return [{ text: testString, kind: 'plain' }]
  }

  const sorted = [...matches].sort((a, b) => a.index - b.index)
  const segments: HighlightSegment[] = []
  let cursor = 0

  for (const m of sorted) {
    if (m.index < cursor) continue
    if (m.index > cursor) {
      segments.push({ text: testString.slice(cursor, m.index), kind: 'plain' })
    }

    const fullEnd = m.index + m.match.length
    let offset = 0
    const hasGroups = m.groups.some((g) => g !== undefined && g !== '')

    if (hasGroups && m.groups.length > 0) {
      let searchFrom = m.index
      for (let gi = 0; gi < m.groups.length; gi++) {
        const group = m.groups[gi]
        if (!group) continue
        const groupStart = testString.indexOf(group, searchFrom)
        if (groupStart < 0 || groupStart >= fullEnd) continue

        if (groupStart > m.index + offset) {
          segments.push({
            text: testString.slice(m.index + offset, groupStart),
            kind: 'match'
          })
        }
        segments.push({ text: group, kind: 'group', groupIndex: gi })
        offset = groupStart + group.length - m.index
        searchFrom = groupStart + group.length
      }
      if (m.index + offset < fullEnd) {
        segments.push({ text: testString.slice(m.index + offset, fullEnd), kind: 'match' })
      }
    } else {
      segments.push({ text: m.match, kind: 'match' })
    }

    cursor = fullEnd
  }

  if (cursor < testString.length) {
    segments.push({ text: testString.slice(cursor), kind: 'plain' })
  }

  return segments
}
