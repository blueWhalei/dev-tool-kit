import { resolve } from 'path'

/**
 * 会话级文件路径授权层。
 *
 * 安全模型：所有文件系统读写必须先经用户可见的对话框确认（打开/保存/选择）。
 * 对话框返回的路径在本模块登记为"已授权"；任何 IPC handler 在读写文件前
 * 必须调用 isPathAuthorized 校验，从而阻止渲染进程绕过对话框直接访问任意路径。
 *
 * 集合仅存在于内存（会话级）：应用重启后清空，符合"本地工具"的预期。
 */
const authorizedPaths = new Set<string>()

export function authorizePath(filePath: unknown): void {
  if (typeof filePath === 'string' && filePath.trim()) {
    try {
      authorizedPaths.add(resolve(filePath))
    } catch {
      // 非法路径直接忽略，无需登记
    }
  }
}

export function isPathAuthorized(filePath: unknown): boolean {
  if (typeof filePath !== 'string' || !filePath.trim()) return false
  try {
    return authorizedPaths.has(resolve(filePath))
  } catch {
    return false
  }
}
