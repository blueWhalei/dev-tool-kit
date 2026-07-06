export type PlatformId = 'win32' | 'darwin' | 'linux'

export type CapabilityLevel = 'full' | 'partial' | 'none' | 'local'

export interface PlatformCapabilityRow {
  feature: string
  win32: CapabilityLevel
  darwin: CapabilityLevel
  linux: CapabilityLevel
  notes?: string
}

/** Platform capability matrix for documentation */
export const PLATFORM_CAPABILITIES: PlatformCapabilityRow[] = [
  {
    feature: '端口扫描',
    win32: 'full',
    darwin: 'full',
    linux: 'full'
  },
  {
    feature: '终止占用进程',
    win32: 'full',
    darwin: 'partial',
    linux: 'partial',
    notes: 'Unix 下可终止用户进程；系统/他人进程可能需 sudo，失败时可复制 kill 命令到终端执行'
  },
  {
    feature: '环境变量管理',
    win32: 'full',
    darwin: 'partial',
    linux: 'partial',
    notes: 'Unix 支持读取与写入 Shell 配置文件（~/.zshrc、~/.bashrc 等），写入前自动备份并预览 diff；Windows 写入注册表'
  },
  {
    feature: 'Hosts 编辑',
    win32: 'partial',
    darwin: 'partial',
    linux: 'partial',
    notes: '写入 /etc/hosts 可能需要管理员权限；失败时提供 sudo 复制命令'
  },
  {
    feature: 'DNS 刷新',
    win32: 'full',
    darwin: 'full',
    linux: 'partial',
    notes: 'Linux 依赖 systemd-resolve 或 nscd'
  },
  {
    feature: '文件重命名',
    win32: 'full',
    darwin: 'full',
    linux: 'full'
  },
  {
    feature: '编码 / Hash / JWT 等本地工具',
    win32: 'local',
    darwin: 'local',
    linux: 'local',
    notes: '纯渲染进程计算，全平台一致'
  }
]

export const PLATFORM_LABELS: Record<PlatformId, string> = {
  win32: 'Windows',
  darwin: 'macOS',
  linux: 'Linux'
}

export function getCapabilityLabel(level: CapabilityLevel): string {
  switch (level) {
    case 'full': return '完整支持'
    case 'partial': return '部分支持'
    case 'local': return '本地可用'
    case 'none': return '不支持'
  }
}
