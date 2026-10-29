import type {
  EnvBackup,
  EnvScope,
  EnvVariable,
  HostsEntry,
  HostsScheme,
  SavedRenameRule
} from '../types'
import { isRenameRule } from '../types/rename'
import { isValidIP, isValidHostname } from './network-validation'
import { isValidRegistryEnvName, isValidEnvValue } from './env-validation'

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown, max = 500): value is string =>
  typeof value === 'string' && value.length <= max && !/[\r\n\0]/.test(value)
export const isHostsText = text
export const isEnvScope = (value: unknown): value is EnvScope =>
  value === 'user' || value === 'system'
export const isEnvVariableArray = (value: unknown): value is EnvVariable[] =>
  Array.isArray(value) &&
  value.every(
    item =>
      isRecord(item) &&
      isValidRegistryEnvName(item.name) &&
      isValidEnvValue(item.value) &&
      isEnvScope(item.type)
  )
export const isEnvBackupArray = (value: unknown): value is EnvBackup[] =>
  Array.isArray(value) &&
  value.every(
    item =>
      isRecord(item) &&
      text(item.name) &&
      !!item.name.trim() &&
      typeof item.timestamp === 'string' &&
      Number.isFinite(Date.parse(item.timestamp)) &&
      isEnvVariableArray(item.variables) &&
      item.variables.every(v => v.type === 'user')
  )
export function isHostsEntry(value: unknown): value is HostsEntry {
  return (
    isRecord(value) &&
    text(value.id) &&
    !!value.id &&
    typeof value.ip === 'string' &&
    isValidIP(value.ip) &&
    typeof value.hostname === 'string' &&
    isValidHostname(value.hostname) &&
    typeof value.enabled === 'boolean' &&
    (value.comment === undefined || text(value.comment)) &&
    (value.group === undefined || text(value.group, 200))
  )
}
export function isHostsSchemeArray(value: unknown): value is HostsScheme[] {
  if (!Array.isArray(value)) return false
  const ids = new Set<string>()
  return value.every(item => {
    if (
      !isRecord(item) ||
      !text(item.id) ||
      !item.id ||
      !text(item.name, 100) ||
      !item.name.trim() ||
      typeof item.timestamp !== 'string' ||
      !Number.isFinite(Date.parse(item.timestamp)) ||
      !Array.isArray(item.entries) ||
      !item.entries.every(isHostsEntry)
    )
      return false
    if (ids.has(item.id)) return false
    ids.add(item.id)
    return (
      new Set(item.entries.map(entry => entry.id)).size === item.entries.length &&
      new Set(item.entries.map(entry => `${entry.ip}\0${entry.hostname}`)).size ===
        item.entries.length
    )
  })
}
export const isSavedRenameRuleArray = (value: unknown): value is SavedRenameRule[] =>
  Array.isArray(value) &&
  value.every(
    item => isRecord(item) && text(item.name) && !!item.name.trim() && isRenameRule(item.rule)
  )
