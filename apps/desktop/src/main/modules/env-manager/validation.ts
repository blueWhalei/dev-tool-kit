export const ENV_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/
export const SETX_MAX_LENGTH = 1024

function containsDangerousValueChars(value: string): boolean {
  return value.includes('\0') || value.includes('\r') || value.includes('\n')
}

export function isValidEnvName(name: unknown): name is string {
  return typeof name === 'string' && ENV_NAME_REGEX.test(name)
}

export function isValidEnvValue(value: unknown): value is string {
  return typeof value === 'string' && !containsDangerousValueChars(value)
}
