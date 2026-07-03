import { describe, it, expect } from 'vitest'
import zhCN from '../apps/desktop/src/renderer/src/locales/messages/zh-CN/index'
import enUS from '../apps/desktop/src/renderer/src/locales/messages/en-US/index'

function collectKeyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') {
    return prefix ? [prefix] : []
  }

  if (Array.isArray(value)) {
    return prefix ? [prefix] : []
  }

  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) {
    return prefix ? [prefix] : []
  }

  const keys: string[] = []
  for (const [key, child] of entries) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      keys.push(...collectKeyPaths(child, path))
    } else {
      keys.push(path)
    }
  }
  return keys.sort()
}

function diffKeys(left: string[], right: string[]) {
  const rightSet = new Set(right)
  const leftSet = new Set(left)
  return {
    missingInRight: left.filter(key => !rightSet.has(key)),
    missingInLeft: right.filter(key => !leftSet.has(key))
  }
}

describe('locale key parity', () => {
  it('zh-CN and en-US share the same message key paths', () => {
    const zhKeys = collectKeyPaths(zhCN)
    const enKeys = collectKeyPaths(enUS)
    const { missingInRight, missingInLeft } = diffKeys(zhKeys, enKeys)

    const messages: string[] = []
    if (missingInRight.length > 0) {
      messages.push(`Missing in en-US:\n${missingInRight.map(key => `  - ${key}`).join('\n')}`)
    }
    if (missingInLeft.length > 0) {
      messages.push(`Missing in zh-CN:\n${missingInLeft.map(key => `  - ${key}`).join('\n')}`)
    }

    expect(messages.join('\n\n'), 'Locale key paths must match between zh-CN and en-US').toBe('')
  })
})
