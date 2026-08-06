import { describe, it, expect } from 'vitest'
import { generatePassphrase } from './diceware-words'

describe('generatePassphrase', () => {
  it('generates passphrase with requested word count', () => {
    expect(generatePassphrase(5).split('-')).toHaveLength(5)
  })

  it('clamps word count to 3..12', () => {
    expect(generatePassphrase(1).split('-')).toHaveLength(3)
    expect(generatePassphrase(100).split('-')).toHaveLength(12)
  })

  it('falls back to default count for NaN', () => {
    expect(generatePassphrase(NaN).split('-')).toHaveLength(6)
  })

  it('uses custom separator', () => {
    expect(generatePassphrase(4, ' ').split(' ')).toHaveLength(4)
  })

  it('contains no hyphenated words (separator ambiguity)', () => {
    for (const word of generatePassphrase(12, ' ').split(' ')) {
      expect(word).not.toContain('-')
    }
  })

  it('is deterministic in length across calls', () => {
    expect(generatePassphrase(7).split('-')).toHaveLength(7)
    expect(generatePassphrase(7).split('-')).toHaveLength(7)
  })
})
