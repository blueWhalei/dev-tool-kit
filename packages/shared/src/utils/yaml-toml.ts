import { TOOL_ERROR_CODES } from '../constants/tool-errors'
import YAML from 'yaml'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'
import type { ConverterResult } from './converter'
import { parseJsonValue } from './json-schema'

function fail(
  error: string,
  errorParams?: Record<string, string | number>
): ConverterResult<never> {
  return { success: false, error, errorParams }
}

export function yamlToJson(text: string): ConverterResult {
  if (!text.trim()) return fail(TOOL_ERROR_CODES.yamlEmpty)
  try {
    const parsed = YAML.parse(text)
    return { success: true, result: JSON.stringify(parsed, null, 2) }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return fail('yamlParseFailed', { detail: msg })
  }
}

export function jsonToYaml(text: string): ConverterResult {
  const jsonResult = parseJsonValue(text)
  if (!jsonResult.success)
    return { success: false, error: jsonResult.error, errorParams: jsonResult.errorParams }
  try {
    const yaml = YAML.stringify(jsonResult.result)
    return { success: true, result: yaml }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return fail('yamlConvertFailed', { detail: msg })
  }
}

export function yamlFormat(text: string): ConverterResult {
  if (!text.trim()) return fail(TOOL_ERROR_CODES.yamlEmpty)
  try {
    const parsed = YAML.parse(text)
    return { success: true, result: YAML.stringify(parsed) }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return fail('yamlFormatFailed', { detail: msg })
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
    return fail('yamlMinifyFailed', { detail: msg })
  }
}

export function tomlToJson(text: string): ConverterResult {
  if (!text.trim()) return fail(TOOL_ERROR_CODES.tomlEmpty)
  try {
    const parsed = parseToml(text)
    return { success: true, result: JSON.stringify(parsed, null, 2) }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return fail('tomlParseFailed', { detail: msg })
  }
}

export function jsonToToml(text: string): ConverterResult {
  const jsonResult = parseJsonValue(text)
  if (!jsonResult.success)
    return { success: false, error: jsonResult.error, errorParams: jsonResult.errorParams }
  try {
    const toml = stringifyToml(jsonResult.result as Record<string, unknown>)
    return { success: true, result: toml }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return fail('tomlConvertFailed', { detail: msg })
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
    return fail('tomlFormatFailed', { detail: msg })
  }
}
