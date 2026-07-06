import { describe, it, expect } from 'vitest'
import {
  buildFlagsString,
  parseFlagsString,
  findRegexMatches,
  applyRegexReplace,
  buildMatchHighlights,
  validateRegexInput,
  REGEX_MAX_INPUT_LENGTH
} from './regex'

describe('regex utils', () => {
  describe('buildFlagsString / parseFlagsString', () => {
    it('round-trips gims flags', () => {
      const flags = { g: true, i: true, m: false, s: true }
      expect(buildFlagsString(flags)).toBe('gis')
      expect(parseFlagsString('gis')).toEqual({ g: true, i: true, m: false, s: true })
    })

    it('returns empty string when no flags', () => {
      expect(buildFlagsString({})).toBe('')
    })
  })

  describe('validateRegexInput', () => {
    it('rejects input over max length', () => {
      const long = 'a'.repeat(REGEX_MAX_INPUT_LENGTH + 1)
      expect(validateRegexInput(long)).toContain('字符限制')
    })

    it('accepts normal input', () => {
      expect(validateRegexInput('hello')).toBeNull()
    })
  })

  describe('findRegexMatches', () => {
    it('finds global matches', () => {
      const result = findRegexMatches('\\d+', 'g', 'a1b22c333')
      expect(result.isValid).toBe(true)
      expect(result.matches.map((m) => m.match)).toEqual(['1', '22', '333'])
    })

    it('captures groups', () => {
      const result = findRegexMatches('(\\d+)', 'g', 'x1y2')
      expect(result.matches[0].groups).toEqual(['1'])
      expect(result.matches[1].groups).toEqual(['2'])
    })

    it('returns error for invalid pattern', () => {
      const result = findRegexMatches('[', 'g', 'test')
      expect(result.isValid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('stops after one match without g flag', () => {
      const result = findRegexMatches('\\d+', '', 'a1b2')
      expect(result.matches).toHaveLength(1)
      expect(result.matches[0].match).toBe('1')
    })
  })

  describe('applyRegexReplace', () => {
    it('replaces with literal text', () => {
      const result = applyRegexReplace('\\d+', 'g', 'a1b2', 'X')
      expect(result.success).toBe(true)
      expect(result.result).toBe('aXbX')
    })

    it('supports $1 capture group references', () => {
      const result = applyRegexReplace('(\\d+)', 'g', 'a1b2', '[$1]')
      expect(result.result).toBe('a[1]b[2]')
    })

    it('supports $2 and multiple groups', () => {
      const result = applyRegexReplace('(\\w)(\\d)', 'g', 'a1 b2', '$2$1')
      expect(result.result).toBe('1a 2b')
    })

    it('supports $$ for literal dollar sign', () => {
      const result = applyRegexReplace('\\d+', 'g', 'price 9', '$$$&')
      expect(result.result).toBe('price $9')
    })

    it('deletes matches with empty replacement', () => {
      const result = applyRegexReplace('\\s+', 'g', 'a  b   c', '')
      expect(result.result).toBe('abc')
    })

    it('is case-insensitive with i flag', () => {
      const result = applyRegexReplace('hello', 'gi', 'Hello HELLO', 'hi')
      expect(result.result).toBe('hi hi')
    })

    it('returns error for invalid pattern', () => {
      const result = applyRegexReplace('(?<', 'g', 'test', 'x')
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  describe('buildMatchHighlights', () => {
    it('returns plain segment when no matches', () => {
      expect(buildMatchHighlights('hello', [])).toEqual([{ text: 'hello', kind: 'plain' }])
    })

    it('highlights matches', () => {
      const { matches } = findRegexMatches('\\d+', 'g', 'a1b2')
      const segments = buildMatchHighlights('a1b2', matches)
      expect(segments.some((s) => s.kind === 'match' && s.text === '1')).toBe(true)
      expect(segments.some((s) => s.kind === 'match' && s.text === '2')).toBe(true)
    })

    it('highlights capture groups separately', () => {
      const { matches } = findRegexMatches('(a)(\\d)', 'g', 'a1')
      const segments = buildMatchHighlights('a1', matches)
      expect(segments.some((s) => s.kind === 'group' && s.groupIndex === 0)).toBe(true)
      expect(segments.some((s) => s.kind === 'group' && s.groupIndex === 1)).toBe(true)
    })
  })
})
