import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_CATEGORIES, CODE_CONVERTER_TAB_KEYWORDS, type RouteCategoryConfig } from '@dev-tool-kit/shared/constants'

export interface TabKeywordMapping {
  tab: string
  keywords: string[]
}

export interface RouteMeta {
  titleKey: string
  icon: string
  category: string
  order: number
  keywords?: string[]
  hidden?: boolean
  deepLinkTab?: string
  tabKeywords?: TabKeywordMapping[]
}

declare module 'vue-router' {
  interface RouteMeta {
    titleKey: string
    icon: string
    category: string
    order: number
    keywords?: string[]
    hidden?: boolean
    deepLinkTab?: string
    tabKeywords?: TabKeywordMapping[]
  }
}

export type CategoryConfig = RouteCategoryConfig
export const categories = ROUTE_CATEGORIES

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: () => {
      const home = localStorage.getItem('dev-toolkit-default-home') || 'PortManager'
      return { name: home }
    }
  },
  {
    path: '/port-manager',
    name: 'PortManager',
    component: () => import('../views/PortManagerView.vue'),
    meta: { titleKey: 'nav.routes.portManager', icon: 'port', category: 'system', order: 1, keywords: ['端口', 'port', '管理', 'manager'] }
  },
  {
    path: '/env-manager',
    name: 'EnvManager',
    component: () => import('../views/EnvManagerView.vue'),
    meta: { titleKey: 'nav.routes.envManager', icon: 'env', category: 'system', order: 2, keywords: ['环境', 'environment', '变量', 'variable', 'env'] }
  },
  {
    path: '/hosts-editor',
    name: 'HostsEditor',
    component: () => import('../views/HostsEditorView.vue'),
    meta: { titleKey: 'nav.routes.hostsEditor', icon: 'hosts', category: 'system', order: 3, keywords: ['hosts', '编辑', 'editor', '域名'] }
  },
  {
    path: '/file-renamer',
    name: 'FileRenamer',
    component: () => import('../views/FileRenamerView.vue'),
    meta: { titleKey: 'nav.routes.fileRenamer', icon: 'folder', category: 'system', order: 4, keywords: ['文件', 'file', '重命名', 'rename', '批量'] }
  },
  {
    path: '/regex-tester',
    name: 'RegexTester',
    component: () => import('../views/RegexTesterView.vue'),
    meta: { titleKey: 'nav.routes.regexTester', icon: 'regex', category: 'system', order: 5, keywords: ['正则', 'regex', '测试', 'test', '表达式'] }
  },
  {
    path: '/code-converter',
    name: 'CodeConverter',
    component: () => import('../views/CodeConverterView.vue'),
    meta: {
      titleKey: 'nav.routes.codeConverter',
      icon: 'convert',
      category: 'encode',
      order: 1,
      keywords: [
        '编码', 'code', '转换', 'converter', '字符集',
        'base64', 'url', 'json', 'yaml', 'toml', '格式化', 'format', '时间戳', 'timestamp',
        '进制', '命名', 'html', '编解码', 'decode', 'encode'
      ],
      tabKeywords: CODE_CONVERTER_TAB_KEYWORDS
    }
  },
  {
    path: '/json-formatter',
    redirect: { path: '/code-converter', query: { tab: 'json' } }
  },
  {
    path: '/timestamp',
    redirect: { path: '/code-converter', query: { tab: 'timestamp' } }
  },
  {
    path: '/color-converter',
    name: 'ColorConverter',
    component: () => import('../views/ColorConverterView.vue'),
    meta: { titleKey: 'nav.routes.colorConverter', icon: 'color', category: 'data', order: 1, keywords: ['颜色', 'color', '转换', 'converter', 'rgb', 'hex'] }
  },
  {
    path: '/uuid-generator',
    name: 'UUIDGenerator',
    component: () => import('../views/UUIDGeneratorView.vue'),
    meta: { titleKey: 'nav.routes.uuidGenerator', icon: 'key', category: 'data', order: 2, keywords: ['uuid', '生成', 'generator', '唯一标识'] }
  },
  {
    path: '/password-generator',
    name: 'PasswordGenerator',
    component: () => import('../views/PasswordGeneratorView.vue'),
    meta: { titleKey: 'nav.routes.passwordGenerator', icon: 'lock', category: 'security', order: 1, keywords: ['密码', 'password', '生成', 'generator', '随机'] }
  },
  {
    path: '/jwt-generator',
    name: 'JWTGenerator',
    component: () => import('../views/JWTGeneratorView.vue'),
    meta: { titleKey: 'nav.routes.jwtGenerator', icon: 'token', category: 'security', order: 2, keywords: ['jwt', 'secret', 'token', '密钥', '解码', 'decode', '验签'], deepLinkTab: 'sign', tabKeywords: [{ tab: 'sign', keywords: ['sign', '签发', 'secret'] }, { tab: 'decode', keywords: ['decode', '解码'] }] }
  },
  {
    path: '/hash-generator',
    name: 'HashGenerator',
    component: () => import('../views/HashGeneratorView.vue'),
    meta: { titleKey: 'nav.routes.hashGenerator', icon: 'hash', category: 'security', order: 3, keywords: ['hash', '生成', 'generator', 'md5', 'sha', '加密'] }
  },
  {
    path: '/certificate-parser',
    name: 'CertificateParser',
    component: () => import('../views/CertificateParserView.vue'),
    meta: { titleKey: 'nav.routes.certificateParser', icon: 'cert', category: 'security', order: 4, keywords: ['certificate', 'cert', 'x509', 'pem', 'ssl', 'tls', '证书', '解析', 'parser'] }
  },
  {
    path: '/base64',
    redirect: { path: '/code-converter', query: { tab: 'base64' } }
  },
  {
    path: '/url',
    redirect: { path: '/code-converter', query: { tab: 'url' } }
  },
  {
    path: '/yaml',
    redirect: { path: '/code-converter', query: { tab: 'yaml' } }
  },
  {
    path: '/toml',
    redirect: { path: '/code-converter', query: { tab: 'toml' } }
  },
  {
    path: '/xml',
    redirect: { path: '/code-converter', query: { tab: 'xml' } }
  },
  {
    path: '/sql',
    redirect: { path: '/code-converter', query: { tab: 'sql' } }
  },
  {
    path: '/image-base64',
    redirect: { path: '/code-converter', query: { tab: 'image' } }
  },
  {
    path: '/text-diff',
    name: 'TextDiff',
    component: () => import('../views/TextDiffView.vue'),
    meta: { titleKey: 'nav.routes.textDiff', icon: 'diff', category: 'encode', order: 2, keywords: ['diff', '对比', '文本', 'text', '差异'] }
  },
  {
    path: '/mock-data',
    name: 'MockData',
    component: () => import('../views/MockDataView.vue'),
    meta: { titleKey: 'nav.routes.mockData', icon: 'mock', category: 'data', order: 3, keywords: ['mock', '数据', '测试', 'fake', '生成'] }
  },
  {
    path: '/connection-string-parser',
    name: 'ConnectionStringParser',
    component: () => import('../views/ConnectionStringParserView.vue'),
    meta: {
      titleKey: 'nav.routes.connectionStringParser',
      icon: 'database',
      category: 'data',
      order: 6,
      keywords: ['connection', '连接', '字符串', 'mysql', 'postgresql', 'redis', 'mongodb', 'uri', 'dsn', 'parser']
    }
  },
  {
    path: '/subnet-calculator',
    name: 'SubnetCalculator',
    component: () => import('../views/SubnetCalculatorView.vue'),
    meta: { titleKey: 'nav.routes.subnetCalculator', icon: 'subnet', category: 'calculator', order: 2, keywords: ['subnet', '子网', 'cidr', 'ip', '网络', '掩码'] }
  },
  {
    path: '/cron-parser',
    name: 'CronParser',
    component: () => import('../views/CronParserView.vue'),
    meta: { titleKey: 'nav.routes.cronParser', icon: 'clock', category: 'calculator', order: 1, keywords: ['cron', '解析', 'parser', '定时', '表达式'] }
  },
  {
    path: '/chmod-calculator',
    name: 'ChmodCalculator',
    component: () => import('../views/ChmodCalculatorView.vue'),
    meta: { titleKey: 'nav.routes.chmodCalculator', icon: 'lock', category: 'calculator', order: 3, keywords: ['chmod', '权限', 'permission', 'octal', 'rwx', 'unix', '文件'] }
  },
  {
    path: '/http-status-codes',
    name: 'HttpStatusCodes',
    component: () => import('../views/HttpStatusCodesView.vue'),
    meta: { titleKey: 'nav.routes.httpStatusCodes', icon: 'http', category: 'data', order: 4, keywords: ['http', 'status', '状态码', '404', '500', 'reference', '速查', '响应'] }
  },
  {
    path: '/qr-code-generator',
    name: 'QrCodeGenerator',
    component: () => import('../views/QrCodeGeneratorView.vue'),
    meta: { titleKey: 'nav.routes.qrCodeGenerator', icon: 'qr', category: 'data', order: 5, keywords: ['qr', 'qrcode', '二维码', '生成', 'generator', 'barcode'] }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
    meta: {
      titleKey: 'nav.routes.settings',
      icon: 'settings',
      category: 'system',
      order: 98,
      hidden: true,
      keywords: ['settings', '设置', '主题', '偏好', '首页', 'language', '语言']
    }
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/AboutView.vue'),
    meta: {
      titleKey: 'nav.routes.about',
      icon: 'info',
      category: 'system',
      order: 99,
      hidden: true,
      keywords: ['about', '关于', '版本', 'version']
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue'),
    meta: { titleKey: 'nav.routes.notFound', icon: 'unknown', category: '', order: 0 }
  }
]

export { routes }

const DEFAULT_HOME = 'PortManager'
const validHomeNames = new Set(
  routes.map(r => r.name).filter((n): n is string => typeof n === 'string' && n !== 'NotFound')
)
routes[0].redirect = () => {
  const home = localStorage.getItem('dev-toolkit-default-home') || DEFAULT_HOME
  return { name: validHomeNames.has(home) ? home : DEFAULT_HOME }
}

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
