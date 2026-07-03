export interface ConverterResult<T = string> {
  success: boolean
  result?: T
  error?: string
}

export interface TimestampInfo {
  date?: string
  local?: string
  unix?: number
  timestamp?: number
  iso?: string
  utc?: string
  millis?: number
}

export interface CaseFormats {
  camelCase: string
  snakeCase: string
  kebabCase: string
  titleCase: string
}

export interface JsonParseError {
  message: string
  line: number
  column: number
  position: number
}

function fail(error: string): ConverterResult<never> {
  return { success: false, error }
}

export function base64Encode(text: string): ConverterResult {
  try {
    const bytes = new TextEncoder().encode(text)
    let binary = ''
    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }
    return { success: true, result: btoa(binary) }
  } catch (error) {
    return fail(String(error))
  }
}

export function base64Decode(text: string): ConverterResult {
  try {
    const binary = atob(text)
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
    return { success: true, result: new TextDecoder().decode(bytes) }
  } catch {
    return fail('Invalid Base64')
  }
}

export function urlEncode(text: string): ConverterResult {
  try {
    return { success: true, result: encodeURIComponent(text) }
  } catch (error) {
    return fail(String(error))
  }
}

export function urlDecode(text: string): ConverterResult {
  try {
    return { success: true, result: decodeURIComponent(text) }
  } catch {
    return fail('Invalid URL encoding')
  }
}

export function getJsonParseError(text: string): JsonParseError | null {
  try {
    JSON.parse(text)
    return null
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const positionMatch = message.match(/position (\d+)/i)
    const position = positionMatch ? parseInt(positionMatch[1], 10) : 0
    const before = text.slice(0, position)
    const line = before.split('\n').length
    const lastNewline = before.lastIndexOf('\n')
    const column = position - lastNewline
    return { message, line, column, position }
  }
}

function formatJsonError(text: string): string {
  const err = getJsonParseError(text)
  if (!err) return '无效的 JSON'
  if (err.line > 0) {
    return `无效的 JSON（第 ${err.line} 行，第 ${err.column} 列）`
  }
  return '无效的 JSON'
}

export function jsonFormat(text: string): ConverterResult {
  if (!text.trim()) return fail('请输入 JSON 内容')
  try {
    const obj = JSON.parse(text)
    return { success: true, result: JSON.stringify(obj, null, 2) }
  } catch {
    return fail(formatJsonError(text))
  }
}

export function jsonMinify(text: string): ConverterResult {
  if (!text.trim()) return fail('请输入 JSON 内容')
  try {
    const obj = JSON.parse(text)
    return { success: true, result: JSON.stringify(obj) }
  } catch {
    return fail(formatJsonError(text))
  }
}

function buildTimestampInfo(date: Date): TimestampInfo {
  const millis = date.getTime()
  return {
    date: date.toISOString(),
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toLocaleString('zh-CN'),
    unix: Math.floor(millis / 1000),
    timestamp: millis,
    millis
  }
}

export function timestampToDate(timestamp: number): ConverterResult<TimestampInfo> {
  if (!Number.isFinite(timestamp)) return fail('无效的时间戳')
  const date = new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp)
  if (isNaN(date.getTime())) return fail('无效的时间戳')
  return { success: true, result: buildTimestampInfo(date) }
}

export function dateToTimestamp(dateStr: string): ConverterResult<TimestampInfo> {
  const trimmed = dateStr.trim()
  if (!trimmed) return fail('请输入日期或时间戳')
  const date = new Date(trimmed)
  if (isNaN(date.getTime())) return fail('无效的日期')
  return { success: true, result: buildTimestampInfo(date) }
}

/** Auto-detect unix seconds, milliseconds, or date string */
export function parseTimestampInput(input: string | number): ConverterResult<TimestampInfo> {
  if (typeof input === 'number') {
    return timestampToDate(input)
  }
  const trimmed = input.trim()
  if (!trimmed) return fail('请输入时间戳或日期')

  if (/^-?\d+$/.test(trimmed)) {
    return timestampToDate(parseInt(trimmed, 10))
  }

  return dateToTimestamp(trimmed)
}

export function numberBaseConvert(
  num: number | string,
  fromBase: number,
  toBase: number
): ConverterResult {
  if (![2, 8, 10, 16].includes(fromBase) || ![2, 8, 10, 16].includes(toBase)) {
    return fail('不支持的数据进制')
  }
  try {
    const decimal = parseInt(String(num), fromBase)
    if (isNaN(decimal)) return fail('无效的数字')

    if (toBase === 16) return { success: true, result: decimal.toString(16).toUpperCase() }
    if (toBase === 2) return { success: true, result: decimal.toString(2) }
    if (toBase === 8) return { success: true, result: decimal.toString(8) }
    return { success: true, result: decimal.toString(10) }
  } catch (error) {
    return fail(String(error))
  }
}

export function toCamelCase(text: string): ConverterResult {
  const result = text
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^[A-Z]/, m => m.toLowerCase())
  return { success: true, result }
}

export function toSnakeCase(text: string): ConverterResult {
  const result = text
    .replace(/([A-Z])/g, '_$1')
    .replace(/[-\s]+/g, '_')
    .toLowerCase()
    .replace(/^_/, '')
  return { success: true, result }
}

export function toKebabCase(text: string): ConverterResult {
  const result = text
    .replace(/([A-Z])/g, '-$1')
    .replace(/[_\s]+/g, '-')
    .toLowerCase()
    .replace(/^-/, '')
  return { success: true, result }
}

export function toTitleCase(text: string): ConverterResult {
  const result = text.replace(/\b\w/g, c => c.toUpperCase())
  return { success: true, result }
}

export function convertAllCaseFormats(text: string): ConverterResult<CaseFormats> {
  if (!text.trim()) return fail('请输入需要转换的文本')
  return {
    success: true,
    result: {
      camelCase: toCamelCase(text).result ?? '',
      snakeCase: toSnakeCase(text).result ?? '',
      kebabCase: toKebabCase(text).result ?? '',
      titleCase: toTitleCase(text).result ?? ''
    }
  }
}

export function htmlEncode(text: string): ConverterResult {
  const result = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
  return { success: true, result }
}

export function htmlDecode(text: string): ConverterResult {
  const result = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
  return { success: true, result }
}

export function applyConverterResult(
  result: ConverterResult,
  onSuccess: (value: string) => void,
  onError?: (error: string) => void
): void {
  if (result.success && result.result !== undefined) {
    onSuccess(result.result)
  } else if (result.error) {
    onError?.(result.error)
  }
}
