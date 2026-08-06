/**
 * localStorage 安全封装：隐私模式/磁盘异常等场景下读写静默失败，
 * 避免应用在无持久化能力的环境中抛异常。
 */

export function safeStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeStorageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // 忽略：无持久化能力时静默降级
  }
}

export function safeStorageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // 忽略
  }
}
