export type MockFieldType = 'name' | 'email' | 'phone' | 'uuid' | 'number' | 'date' | 'boolean'

export interface MockField {
  name: string
  type: MockFieldType
}

const FIRST_NAMES = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴']
const LAST_NAMES = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '涛', '明']
const DOMAINS = ['example.com', 'test.io', 'demo.dev', 'mock.local']

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

function generateFieldValue(type: MockFieldType): unknown {
  switch (type) {
    case 'name': return generateName()
    case 'email': return generateEmail()
    case 'phone': return generatePhone()
    case 'uuid': return generateUuid()
    case 'number': return randomInt(1, 10000)
    case 'date': return generateDate()
    case 'boolean': return Math.random() > 0.5
  }
}

export function generateMockRecords(fields: MockField[], count: number): Record<string, unknown>[] {
  const safeCount = Math.max(1, Math.min(count, 1000))
  const records: Record<string, unknown>[] = []

  for (let i = 0; i < safeCount; i++) {
    const record: Record<string, unknown> = {}
    for (const field of fields) {
      const key = field.name.trim() || `field_${fields.indexOf(field) + 1}`
      record[key] = generateFieldValue(field.type)
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
  boolean: '布尔值'
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
      { name: 'id', type: 'uuid' },
      { name: 'name', type: 'name' },
      { name: 'email', type: 'email' },
      { name: 'phone', type: 'phone' },
      { name: 'active', type: 'boolean' },
      { name: 'createdAt', type: 'date' }
    ]
  },
  order: {
    label: '订单',
    description: '电商订单字段',
    fields: [
      { name: 'orderId', type: 'uuid' },
      { name: 'customer', type: 'name' },
      { name: 'amount', type: 'number' },
      { name: 'paid', type: 'boolean' },
      { name: 'orderDate', type: 'date' }
    ]
  },
  article: {
    label: '文章',
    description: '内容文章字段',
    fields: [
      { name: 'id', type: 'uuid' },
      { name: 'title', type: 'name' },
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

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
