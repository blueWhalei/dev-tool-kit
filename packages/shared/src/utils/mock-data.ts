export type MockFieldType =
  | 'name'
  | 'email'
  | 'phone'
  | 'uuid'
  | 'number'
  | 'date'
  | 'boolean'
  | 'address'
  | 'company'
  | 'ip'
  | 'enum'
  | 'increment'
  | 'text'

export interface MockField {
  name: string
  type: MockFieldType
  /** Comma-separated options for `enum` type */
  options?: string
}

export const MOCK_FIELD_TYPES: MockFieldType[] = [
  'name',
  'email',
  'phone',
  'uuid',
  'number',
  'date',
  'boolean',
  'address',
  'company',
  'ip',
  'enum',
  'increment',
  'text'
]

const FIRST_NAMES = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴']
const LAST_NAMES = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '涛', '明']
const DOMAINS = ['example.com', 'test.io', 'demo.dev', 'mock.local']
const CITIES = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '武汉市', '南京市']
const DISTRICTS = ['朝阳区', '海淀区', '浦东新区', '天河区', '南山区', '西湖区', '武侯区', '江汉区']
const STREETS = ['中山路', '人民路', '解放路', '建设路', '和平路', '文化路', '科技大道', '创新路']
const COMPANY_PREFIXES = ['华', '中', '东', '新', '联', '创', '智', '博', '盛', '恒']
const COMPANY_SUFFIXES = ['科技', '信息', '网络', '软件', '数据', '智能', '互联', '数字']
const COMPANY_TYPES = ['有限公司', '股份有限公司', '集团']
const LOREM_SENTENCES = [
  '这是一段用于测试的示例文本。',
  'Lorem ipsum dolor sit amet.',
  'Mock data helps speed up development.',
  '本地离线生成的随机句子。',
  'The quick brown fox jumps over the lazy dog.'
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateUuid(): string {
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = randomInt(0, 255)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function generateName(): string {
  return pick(FIRST_NAMES) + pick(LAST_NAMES) + (Math.random() > 0.7 ? pick(LAST_NAMES) : '')
}

function generateEmail(): string {
  const user = `user${randomInt(100, 9999)}`
  return `${user}@${pick(DOMAINS)}`
}

function generatePhone(): string {
  const prefixes = ['130', '131', '132', '133', '135', '136', '137', '138', '139', '150', '151', '152', '186', '188']
  return `${pick(prefixes)}${String(randomInt(0, 99999999)).padStart(8, '0')}`
}

function generateDate(): string {
  const start = new Date(2020, 0, 1).getTime()
  const end = Date.now()
  const date = new Date(start + Math.random() * (end - start))
  return date.toISOString().split('T')[0]
}

function generateAddress(): string {
  const city = pick(CITIES)
  const district = pick(DISTRICTS)
  const street = pick(STREETS)
  const number = randomInt(1, 999)
  return `${city}${district}${street}${number}号`
}

function generateCompany(): string {
  return `${pick(COMPANY_PREFIXES)}${pick(COMPANY_SUFFIXES)}${pick(COMPANY_TYPES)}`
}

function generateIp(): string {
  return `${randomInt(1, 223)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`
}

function parseEnumOptions(options?: string): string[] {
  if (!options?.trim()) return ['option1', 'option2', 'option3']
  const parsed = options.split(',').map(o => o.trim()).filter(Boolean)
  return parsed.length > 0 ? parsed : ['option1']
}

function generateEnum(options?: string): string {
  return pick(parseEnumOptions(options))
}

function generateText(): string {
  return pick(LOREM_SENTENCES)
}

function generateFieldValue(field: MockField, recordIndex: number): unknown {
  switch (field.type) {
    case 'name': return generateName()
    case 'email': return generateEmail()
    case 'phone': return generatePhone()
    case 'uuid': return generateUuid()
    case 'number': return randomInt(1, 10000)
    case 'date': return generateDate()
    case 'boolean': return Math.random() > 0.5
    case 'address': return generateAddress()
    case 'company': return generateCompany()
    case 'ip': return generateIp()
    case 'enum': return generateEnum(field.options)
    case 'increment': return recordIndex + 1
    case 'text': return generateText()
  }
}

export function generateMockRecords(fields: MockField[], count: number): Record<string, unknown>[] {
  const safeCount = Math.max(1, Math.min(count, 1000))
  const records: Record<string, unknown>[] = []

  for (let i = 0; i < safeCount; i++) {
    const record: Record<string, unknown> = {}
    for (const field of fields) {
      const key = field.name.trim() || `field_${fields.indexOf(field) + 1}`
      record[key] = generateFieldValue(field, i)
    }
    records.push(record)
  }

  return records
}

export const MOCK_FIELD_TYPE_LABELS: Record<MockFieldType, string> = {
  name: '姓名',
  email: '邮箱',
  phone: '手机号',
  uuid: 'UUID',
  number: '数字',
  date: '日期',
  boolean: '布尔值',
  address: '地址',
  company: '公司',
  ip: 'IP',
  enum: '枚举',
  increment: '自增 ID',
  text: '文本'
}

export interface MockPreset {
  label: string
  description: string
  fields: MockField[]
}

export const MOCK_PRESETS: Record<string, MockPreset> = {
  user: {
    label: '用户',
    description: '基础用户信息',
    fields: [
      { name: 'id', type: 'increment' },
      { name: 'name', type: 'name' },
      { name: 'email', type: 'email' },
      { name: 'phone', type: 'phone' },
      { name: 'address', type: 'address' },
      { name: 'active', type: 'boolean' },
      { name: 'createdAt', type: 'date' }
    ]
  },
  order: {
    label: '订单',
    description: '电商订单字段',
    fields: [
      { name: 'orderId', type: 'increment' },
      { name: 'customer', type: 'name' },
      { name: 'company', type: 'company' },
      { name: 'amount', type: 'number' },
      { name: 'status', type: 'enum', options: 'pending,paid,shipped,delivered' },
      { name: 'orderDate', type: 'date' }
    ]
  },
  article: {
    label: '文章',
    description: '内容文章字段',
    fields: [
      { name: 'id', type: 'increment' },
      { name: 'title', type: 'name' },
      { name: 'summary', type: 'text' },
      { name: 'author', type: 'name' },
      { name: 'published', type: 'boolean' },
      { name: 'publishDate', type: 'date' }
    ]
  }
}

export function recordsToCsv(records: Record<string, unknown>[]): string {
  if (records.length === 0) return ''
  const headers = Object.keys(records[0])
  const escape = (value: unknown): string => {
    const text = String(value ?? '')
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }
  const lines = [
    headers.join(','),
    ...records.map(record => headers.map(header => escape(record[header])).join(','))
  ]
  return lines.join('\n')
}

export function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''")
}

export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  return `'${escapeSqlString(String(value))}'`
}

export function sanitizeSqlTableName(tableName: string): string {
  const trimmed = tableName.trim()
  if (!trimmed) return 'mock_data'
  const sanitized = trimmed.replace(/[^a-zA-Z0-9_]/g, '_')
  return sanitized || 'mock_data'
}

export function recordsToSqlInsert(
  records: Record<string, unknown>[],
  tableName = 'mock_data'
): string {
  if (records.length === 0) return ''
  const table = sanitizeSqlTableName(tableName)
  const headers = Object.keys(records[0])
  const columns = headers.map(h => `\`${h}\``).join(', ')
  const lines = records.map(record => {
    const values = headers.map(header => sqlLiteral(record[header])).join(', ')
    return `INSERT INTO \`${table}\` (${columns}) VALUES (${values});`
  })
  return lines.join('\n')
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
