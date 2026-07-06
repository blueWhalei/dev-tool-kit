import type { ErrorObject } from 'ajv'
import Ajv from 'ajv'
import type { ConverterResult } from './converter'
import { getJsonParseError } from './converter'

export interface SchemaValidationError {
  path: string
  message: string
}

export interface SchemaValidationResult {
  success: boolean
  valid?: boolean
  errors?: SchemaValidationError[]
  error?: string
}

function fail(error: string): ConverterResult<never> {
  return { success: false, error }
}

export function parseJsonValue(text: string): ConverterResult<unknown> {
  if (!text.trim()) return fail('请输入 JSON 内容')
  try {
    return { success: true, result: JSON.parse(text) }
  } catch {
    const err = getJsonParseError(text)
    if (err && err.line > 0) {
      return fail(`无效的 JSON（第 ${err.line} 行，第 ${err.column} 列）`)
    }
    return fail('无效的 JSON')
  }
}

export function parseJsonSchema(schemaText: string): ConverterResult<object> {
  if (!schemaText.trim()) return fail('请输入 JSON Schema')
  try {
    const schema = JSON.parse(schemaText) as unknown
    if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
      return fail('JSON Schema 必须是对象')
    }
    return { success: true, result: schema }
  } catch {
    return fail('无效的 JSON Schema')
  }
}

function formatAjvMessage(err: ErrorObject): string {
  const keyword = err.keyword
  const params = err.params as Record<string, unknown>

  if (keyword === 'type' && typeof params.type === 'string') {
    return `must be ${params.type}`
  }
  if (keyword === 'required' && typeof params.missingProperty === 'string') {
    return `missing required property "${params.missingProperty}"`
  }
  if (keyword === 'additionalProperties' && typeof params.additionalProperty === 'string') {
    return `must NOT have additional property "${params.additionalProperty}"`
  }
  if (keyword === 'enum' && Array.isArray(params.allowedValues)) {
    return `must be equal to one of the allowed values`
  }

  return err.message ?? 'validation failed'
}

function formatAjvPath(instancePath: string): string {
  return instancePath || '/'
}

export function validateAgainstSchema(data: unknown, schemaText: string): SchemaValidationResult {
  const schemaResult = parseJsonSchema(schemaText)
  if (!schemaResult.success) {
    return { success: false, error: schemaResult.error }
  }

  const ajv = new Ajv({ allErrors: true, strict: false })
  const validate = ajv.compile(schemaResult.result!)
  const valid = validate(data)

  if (valid) {
    return { success: true, valid: true }
  }

  const errors = (validate.errors ?? []).map((err) => ({
    path: formatAjvPath(err.instancePath),
    message: formatAjvMessage(err)
  }))

  return { success: true, valid: false, errors }
}

export function formatSchemaErrorLine(error: SchemaValidationError): string {
  return `${error.path}: ${error.message}`
}
