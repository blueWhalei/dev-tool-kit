import YAML from 'yaml'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'
import { getJsonParseError, type ConverterResult } from './converter'

function fail(error: string): ConverterResult<never> {
  return { success: false, error }
}

function parseJson(text: string): ConverterResult<unknown> {
  const err = getJsonParseError(text)
  if (err) {
    const detail = err.line > 0 ? `（第 ${err.line} 行，第 ${err.column} 列）` : ''
    return fail(`无效的 JSON 格式${detail}`)
  }
  return { success: true, result: JSON.parse(text) }
}

export function yamlToJson(text: string): ConverterResult {
  if (!text.trim()) return fail('请输入 YAML 内容')
  try {
    const parsed = YAML.parse(text)
    return { success: true, result: JSON.stringify(parsed, null, 2) }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return fail(`YAML 解析失败: ${msg}`)
  }
}

export function jsonToYaml(text: string): ConverterResult {
  const jsonResult = parseJson(text)
  if (!jsonResult.success) return fail(jsonResult.error ?? '无效的 JSON 格式')
  try {
    const yaml = YAML.stringify(jsonResult.result)
    return { success: true, result: yaml }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return fail(`YAML 转换失败: ${msg}`)
  }
}

export function yamlFormat(text: string): ConverterResult {
  if (!text.trim()) return fail('请输入 YAML 内容')
  try {
    const parsed = YAML.parse(text)
    return { success: true, result: YAML.stringify(parsed) }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return fail(`YAML 格式化失败: ${msg}`)
  }
}

export function yamlMinify(text: string): ConverterResult {
  const jsonResult = yamlToJson(text)
  if (!jsonResult.success) return jsonResult
  try {
    const parsed = JSON.parse(jsonResult.result!)
    return { success: true, result: YAML.stringify(parsed, { lineWidth: 0 }) }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return fail(`YAML 压缩失败: ${msg}`)
  }
}

export function tomlToJson(text: string): ConverterResult {
  if (!text.trim()) return fail('请输入 TOML 内容')
  try {
    const parsed = parseToml(text)
    return { success: true, result: JSON.stringify(parsed, null, 2) }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return fail(`TOML 解析失败: ${msg}`)
  }
}

export function jsonToToml(text: string): ConverterResult {
  const jsonResult = parseJson(text)
  if (!jsonResult.success) return fail(jsonResult.error ?? '无效的 JSON 格式')
  try {
    const toml = stringifyToml(jsonResult.result as Record<string, unknown>)
    return { success: true, result: toml }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return fail(`TOML 转换失败: ${msg}`)
  }
}

export function tomlFormat(text: string): ConverterResult {
  const jsonResult = tomlToJson(text)
  if (!jsonResult.success) return jsonResult
  try {
    const parsed = JSON.parse(jsonResult.result!)
    return { success: true, result: stringifyToml(parsed as Record<string, unknown>) }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return fail(`TOML 格式化失败: ${msg}`)
  }
}
