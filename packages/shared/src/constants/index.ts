export * from './shortcuts'
export * from './platform-capabilities'

// App constants
export const APP_NAME = 'DevToolkit'
export const APP_VERSION = '1.0.0'

// Common ports
export const COMMON_PORTS: { port: number; service: string }[] = [
  { port: 21, service: 'FTP' },
  { port: 22, service: 'SSH' },
  { port: 23, service: 'Telnet' },
  { port: 25, service: 'SMTP' },
  { port: 53, service: 'DNS' },
  { port: 80, service: 'HTTP' },
  { port: 110, service: 'POP3' },
  { port: 143, service: 'IMAP' },
  { port: 443, service: 'HTTPS' },
  { port: 445, service: 'SMB' },
  { port: 993, service: 'IMAPS' },
  { port: 995, service: 'POP3S' },
  { port: 1433, service: 'MSSQL' },
  { port: 1521, service: 'Oracle' },
  { port: 3000, service: 'Dev Server' },
  { port: 3306, service: 'MySQL' },
  { port: 3389, service: 'RDP' },
  { port: 5432, service: 'PostgreSQL' },
  { port: 5672, service: 'RabbitMQ' },
  { port: 6379, service: 'Redis' },
  { port: 8000, service: 'HTTP Alt' },
  { port: 8080, service: 'HTTP Proxy' },
  { port: 8443, service: 'HTTPS Alt' },
  { port: 9200, service: 'Elasticsearch' },
  { port: 27017, service: 'MongoDB' }
]

// Module categories (route sidebar)
export interface RouteCategoryConfig {
  key: string
  label: string
  icon: string
  order: number
}

export const ROUTE_CATEGORIES: RouteCategoryConfig[] = [
  { key: 'system', label: '系统工具', icon: 'category-system', order: 1 },
  { key: 'encode', label: '编码解码', icon: 'category-encode', order: 2 },
  { key: 'data', label: '数据转换', icon: 'category-data', order: 3 },
  { key: 'security', label: '密码与密钥', icon: 'category-security', order: 4 },
  { key: 'calculator', label: '计算器', icon: 'category-calculator', order: 5 }
]

/** CodeConverter sub-tab keywords for global search deep links */
export const CODE_CONVERTER_TAB_KEYWORDS: { tab: string; keywords: string[] }[] = [
  { tab: 'base64', keywords: ['base64'] },
  { tab: 'url', keywords: ['url'] },
  { tab: 'json', keywords: ['json', '格式化', 'format', 'json-formatter'] },
  { tab: 'timestamp', keywords: ['timestamp', '时间戳', '时间'] },
  { tab: 'number', keywords: ['进制', 'number', 'binary', 'hex', '八进制', '二进制'] },
  { tab: 'case', keywords: ['命名', 'camel', 'snake', 'kebab', 'case', '驼峰'] },
  { tab: 'html', keywords: ['html', '实体', '编解码'] },
  { tab: 'yaml', keywords: ['yaml', 'yml'] },
  { tab: 'toml', keywords: ['toml'] }
]

/** localStorage key for code converter active tab */
export const CODE_CONVERTER_TAB_STORAGE_KEY = 'dev-toolkit-code-converter-tab'

/** localStorage key for pinned sidebar tools */
export const PINNED_TOOLS_STORAGE_KEY = 'dev-toolkit-pinned-tools'

/** Preferences export format version */
export const PREFERENCES_EXPORT_VERSION = 1

export interface AppPreferencesExport {
  version: typeof PREFERENCES_EXPORT_VERSION
  themePreference: 'light' | 'dark' | 'system'
  localePreference?: 'zh-CN' | 'en-US' | 'system'
  defaultHomeRoute: string
  pinnedTools: string[]
  recentTools: string[]
  codeConverterTab?: string
}

// Legacy alias — prefer ROUTE_CATEGORIES
export const MODULE_CATEGORIES = {
  system: { label: '系统工具', icon: '⚙️' },
  developer: { label: '开发工具', icon: '🔧' },
  utility: { label: '实用工具', icon: '🛠️' },
  network: { label: '网络工具', icon: '🌐' }
} as const

// Theme tokens
export const COLORS = {
  light: {
    primary: '#007AFF',
    secondary: '#5856D6',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#FFFFFF',
    surface: '#F5F5F7',
    text: '#1D1D1F',
    textSecondary: '#86868B'
  },
  dark: {
    primary: '#0A84FF',
    secondary: '#5E5CE6',
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    background: '#1D1D1F',
    surface: '#2C2C2E',
    text: '#F5F5F7',
    textSecondary: '#98989D'
  }
} as const

// Spacing tokens
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
} as const

// Border radius tokens
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999
} as const
