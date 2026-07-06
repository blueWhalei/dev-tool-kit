import type { ConverterResult } from './converter'

export interface PermissionBits {
  read: boolean
  write: boolean
  execute: boolean
}

export interface ChmodSpecialBits {
  setuid: boolean
  setgid: boolean
  sticky: boolean
}

export interface ChmodPermissions {
  owner: PermissionBits
  group: PermissionBits
  other: PermissionBits
  special: ChmodSpecialBits
}

export interface ChmodInfo {
  octal: string
  symbolic: string
  permissions: ChmodPermissions
}

export const DEFAULT_CHMOD_PERMISSIONS: ChmodPermissions = {
  owner: { read: true, write: true, execute: true },
  group: { read: true, write: false, execute: true },
  other: { read: true, write: false, execute: true },
  special: { setuid: false, setgid: false, sticky: false }
}

function fail(error: string): ConverterResult<never> {
  return { success: false, error }
}

function tripletToDigit(bits: PermissionBits): number {
  return (bits.read ? 4 : 0) + (bits.write ? 2 : 0) + (bits.execute ? 1 : 0)
}

function digitToTriplet(digit: number): PermissionBits {
  return {
    read: (digit & 4) !== 0,
    write: (digit & 2) !== 0,
    execute: (digit & 1) !== 0
  }
}

function specialToDigit(special: ChmodSpecialBits): number {
  return (special.setuid ? 4 : 0) + (special.setgid ? 2 : 0) + (special.sticky ? 1 : 0)
}

function digitToSpecial(digit: number): ChmodSpecialBits {
  return {
    setuid: (digit & 4) !== 0,
    setgid: (digit & 2) !== 0,
    sticky: (digit & 1) !== 0
  }
}

function formatExecuteSymbolic(
  execute: boolean,
  specialActive: boolean,
  specialKind: 'setuid' | 'setgid' | 'sticky'
): string {
  if (specialActive) {
    if (specialKind === 'sticky') return execute ? 't' : 'T'
    return execute ? 's' : 'S'
  }
  return execute ? 'x' : '-'
}

function formatTripletSymbolic(bits: PermissionBits, specialActive: boolean, specialKind: 'setuid' | 'setgid' | 'sticky'): string {
  return (
    (bits.read ? 'r' : '-') +
    (bits.write ? 'w' : '-') +
    formatExecuteSymbolic(bits.execute, specialActive, specialKind)
  )
}

export function permissionsToOctal(permissions: ChmodPermissions): string {
  const base = `${tripletToDigit(permissions.owner)}${tripletToDigit(permissions.group)}${tripletToDigit(permissions.other)}`
  const specialDigit = specialToDigit(permissions.special)
  return specialDigit > 0 ? `${specialDigit}${base}` : base
}

export function permissionsToSymbolic(permissions: ChmodPermissions): string {
  const { owner, group, other, special } = permissions
  return (
    formatTripletSymbolic(owner, special.setuid, 'setuid') +
    formatTripletSymbolic(group, special.setgid, 'setgid') +
    formatTripletSymbolic(other, special.sticky, 'sticky')
  )
}

export function chmodFromPermissions(permissions: ChmodPermissions): ChmodInfo {
  return {
    octal: permissionsToOctal(permissions),
    symbolic: permissionsToSymbolic(permissions),
    permissions
  }
}

export function parseChmodOctal(input: string): ConverterResult<ChmodInfo> {
  const trimmed = input.trim()
  if (!trimmed) {
    return fail('请输入八进制权限，例如 755')
  }
  if (!/^[0-7]{3,4}$/.test(trimmed)) {
    return fail('八进制权限无效，应为 3 或 4 位八进制数字')
  }

  let special = digitToSpecial(0)
  let digits = trimmed

  if (trimmed.length === 4) {
    special = digitToSpecial(parseInt(trimmed[0], 10))
    digits = trimmed.slice(1)
  }

  return {
    success: true,
    result: chmodFromPermissions({
      owner: digitToTriplet(parseInt(digits[0], 10)),
      group: digitToTriplet(parseInt(digits[1], 10)),
      other: digitToTriplet(parseInt(digits[2], 10)),
      special
    })
  }
}

function parseExecuteChar(
  char: string,
  specialKind: 'setuid' | 'setgid' | 'sticky'
): { execute: boolean; special: boolean } | null {
  const upper = specialKind === 'sticky' ? 'T' : 'S'
  const lower = specialKind === 'sticky' ? 't' : 's'

  if (char === lower) return { execute: true, special: true }
  if (char === upper) return { execute: false, special: true }
  if (char === 'x') return { execute: true, special: false }
  if (char === '-') return { execute: false, special: false }
  return null
}

function parseTriplet(chars: string, specialKind: 'setuid' | 'setgid' | 'sticky'): { bits: PermissionBits; special: boolean } | null {
  if (chars.length !== 3) return null

  const read = chars[0] === 'r'
  const write = chars[1] === 'w'
  if (chars[0] !== 'r' && chars[0] !== '-') return null
  if (chars[1] !== 'w' && chars[1] !== '-') return null

  const executeInfo = parseExecuteChar(chars[2], specialKind)
  if (!executeInfo) return null

  return {
    bits: { read, write, execute: executeInfo.execute },
    special: executeInfo.special
  }
}

export function parseChmodSymbolic(input: string): ConverterResult<ChmodInfo> {
  let trimmed = input.trim()
  if (!trimmed) {
    return fail('请输入符号权限，例如 rwxr-xr-x')
  }

  if (trimmed.length >= 10 && /^[dlcbps-]/.test(trimmed[0])) {
    trimmed = trimmed.slice(1)
  }

  if (trimmed.length !== 9) {
    return fail('符号权限格式无效，例如 rwxr-xr-x')
  }

  const ownerParsed = parseTriplet(trimmed.slice(0, 3), 'setuid')
  const groupParsed = parseTriplet(trimmed.slice(3, 6), 'setgid')
  const otherParsed = parseTriplet(trimmed.slice(6, 9), 'sticky')

  if (!ownerParsed || !groupParsed || !otherParsed) {
    return fail('符号权限格式无效，例如 rwxr-xr-x')
  }

  return {
    success: true,
    result: chmodFromPermissions({
      owner: ownerParsed.bits,
      group: groupParsed.bits,
      other: otherParsed.bits,
      special: {
        setuid: ownerParsed.special,
        setgid: groupParsed.special,
        sticky: otherParsed.special
      }
    })
  }
}
