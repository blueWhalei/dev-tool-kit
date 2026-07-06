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
  '请输入 Secret 以签名': 'signSecretEmpty',
  '请输入 JWT Header': 'headerEmpty',
  '请输入 JWT Payload': 'payloadEmpty',
  'JWT Header 必须是 JSON 对象': 'headerNotObject',
  'JWT Payload 必须是 JSON 对象': 'payloadNotObject',
  'JWT Header 不是有效的 JSON': 'headerInvalidJson',
  'JWT Payload 不是有效的 JSON': 'payloadInvalidJson',
  '请输入 CIDR，例如 192.168.1.0/24': 'cidrEmpty',
  'CIDR 格式无效，请使用如 192.168.1.0/24': 'cidrInvalid',
  'CIDR 格式无效，应为 IP/前缀长度，例如 192.168.1.0/24': 'cidrInvalid',
  '前缀长度必须在 0-32 之间': 'cidrPrefixInvalid',
  '前缀长度必须在 0-128 之间': 'cidrPrefixInvalidV6',
  'IP 地址无效': 'ipInvalid',
  'IPv6 地址无效': 'ipv6Invalid',
  '请输入八进制权限，例如 755': 'octalEmpty',
  '八进制权限无效，应为 3 或 4 位八进制数字': 'octalInvalid',
  '请输入符号权限，例如 rwxr-xr-x': 'symbolicEmpty',
  '符号权限格式无效，例如 rwxr-xr-x': 'symbolicInvalid',
  '请输入 PEM 证书内容': 'pemEmpty',
  '未找到有效的 PEM 证书块': 'pemNotFound',
  'Invalid Base64': 'base64Invalid',
  'Invalid URL encoding': 'urlInvalid',
  'Unix 平台当前为只读模式，请使用导出功能': 'readOnly',
  'HOSTS_PERMISSION_DENIED': 'permissionDenied',
  '写入 Shell 配置文件失败': 'shellWriteFailed',
  '请输入 JSON Schema': 'schemaEmpty',
  'JSON Schema 必须是对象': 'schemaNotObject',
  '无效的 JSON Schema': 'schemaInvalid'
}

export function translateToolError(
  t: ComposerTranslation,
  tool: string,
  error: string | undefined | null
): string {
  if (!error) return ''
  const key = ERROR_KEY_MAP[error] ?? error
  const translated = t(`tools.${tool}.errors.${key}`)
  if (translated !== `tools.${tool}.errors.${key}`) return translated
  // JSON line error pattern
  const jsonLine = error.match(/^无效的 JSON（第 (\d+) 行附近）$/)
  if (jsonLine) {
    return t(`tools.${tool}.errors.jsonInvalidLine`, { line: jsonLine[1] })
  }
  const yamlFail = error.match(/^(YAML|TOML) (解析|转换|格式化)失败:/)
  if (yamlFail) return error
  return error
}
