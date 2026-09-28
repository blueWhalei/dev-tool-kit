import type { RenameRule } from './index'

/** Validate the current persisted/IPC shape without converting historical inputs. */
export function isRenameRule(value: unknown): value is RenameRule {
  if (!value || typeof value !== 'object') return false
  const rule = value as Record<string, unknown>
  if (
    typeof rule.type !== 'string' ||
    !['prefix', 'suffix', 'replace', 'regex', 'number', 'case', 'date'].includes(rule.type)
  )
    return false
  for (const field of ['value', 'replaceWith', 'pattern']) {
    if (rule[field] !== undefined && typeof rule[field] !== 'string') return false
  }
  if (
    rule.startNumber !== undefined &&
    (typeof rule.startNumber !== 'number' ||
      !Number.isSafeInteger(rule.startNumber) ||
      rule.startNumber < 1)
  )
    return false
  if (
    rule.padding !== undefined &&
    (typeof rule.padding !== 'number' ||
      !Number.isInteger(rule.padding) ||
      rule.padding < 1 ||
      rule.padding > 10)
  )
    return false
  return (
    rule.caseType === undefined ||
    (typeof rule.caseType === 'string' && ['upper', 'lower', 'title'].includes(rule.caseType))
  )
}
