export const ENV_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/
export const DANGEROUS_VALUE_CHARS = /[\x00\r\n]/
export const SETX_MAX_LENGTH = 1024

export function isValidEnvName(name: unknown): name is string {
  return typeof name === 'string' && ENV_NAME_REGEX.test(name)
}

export function isValidEnvValue(value: unknown): value is string {
  return typeof value === 'string' && !DANGEROUS_VALUE_CHARS.test(value)
}
