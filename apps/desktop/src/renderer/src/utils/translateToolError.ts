import type { ComposerTranslation } from 'vue-i18n'

/** Map shared/runtime Chinese error text to i18n keys under tools.*.errors */
const ERROR_KEY_MAP: Record<string, string> = {
  '请输入 JSON 内容': 'jsonEmpty',
  '无效的 JSON': 'jsonInvalid',
  '无效的时间戳': 'timestampInvalid',
  '请输入日期或时间戳': 'dateEmpty',
  '无效的日期': 'dateInvalid',
  '请输入时间戳或日期': 'timestampOrDateEmpty',
  '不支持的数据进制': 'radixUnsupported',
  '无效的数字': 'numberInvalid',
  '请输入需要转换的文本': 'namingEmpty',
  '请输入 YAML 内容': 'yamlEmpty',
  '请输入 TOML 内容': 'tomlEmpty',
  '无效的 Cron 表达式': 'invalidExpression',
  '无效的 Base64URL 编码': 'invalidBase64Url',
  '请输入 JWT Token': 'tokenEmpty',
  '请输入 Secret 以验签': 'secretEmpty',
  '请输入 CIDR，例如 192.168.1.0/24': 'cidrEmpty',
  'CIDR 格式无效，请使用如 192.168.1.0/24': 'cidrInvalid',
  'CIDR 格式无效，应为 IP/前缀长度，例如 192.168.1.0/24': 'cidrInvalid',
  '前缀长度必须在 0-32 之间': 'cidrPrefixInvalid',
  'IP 地址无效': 'ipInvalid',
  'Invalid Base64': 'base64Invalid',
  'Invalid URL encoding': 'urlInvalid'
}

export function translateToolError(
  t: ComposerTranslation,
  tool: string,
  error: string | undefined | null
): string {
  if (!error) return ''
  const key = ERROR_KEY_MAP[error]
  if (key) {
    const translated = t(`tools.${tool}.errors.${key}`)
    if (translated !== `tools.${tool}.errors.${key}`) return translated
  }
  // JSON line error pattern
  const jsonLine = error.match(/^无效的 JSON（第 (\d+) 行附近）$/)
  if (jsonLine) {
    return t(`tools.${tool}.errors.jsonInvalidLine`, { line: jsonLine[1] })
  }
  const yamlFail = error.match(/^(YAML|TOML) (解析|转换|格式化)失败:/)
  if (yamlFail) return error
  return error
}
