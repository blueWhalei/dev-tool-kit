import type { HostsEntry } from '@dev-tool-kit/shared'

/** 清洗 hosts 可编辑文本字段：禁止换行/空字符，截断长度 */
export function sanitizeHostsText(value: string, maxLength: number): string {
  return value.replace(/[\r\n\0]/g, '').slice(0, maxLength)
}

/** 按字段白名单重建 HostsEntry，防止渲染进程注入任意字段/控制字符 */
export function sanitizeHostsEntry(entry: HostsEntry): HostsEntry {
  return {
    id: entry.id,
    ip: entry.ip,
    hostname: entry.hostname,
    comment: typeof entry.comment === 'string' ? sanitizeHostsText(entry.comment, 500) : undefined,
    enabled: typeof entry.enabled === 'boolean' ? entry.enabled : true,
    group: typeof entry.group === 'string' ? sanitizeHostsText(entry.group, 200) : undefined
  }
}
