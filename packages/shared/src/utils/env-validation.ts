/** Shell identifiers and Windows registry variable names have different grammars. */
export function isValidShellEnvName(name: unknown): name is string {
  return typeof name === 'string' && name.trim() === name && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
}

export function isValidRegistryEnvName(name: unknown): name is string {
  return (
    typeof name === 'string' && name.length > 0 && name.length <= 32766 && !/[=\r\n\0]/.test(name)
  )
}

export function isValidEnvValue(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 32766 && !/[\r\n\0]/.test(value)
}
