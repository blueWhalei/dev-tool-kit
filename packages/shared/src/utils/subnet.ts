import type { ConverterResult } from './converter'

export type IpVersion = 'ipv4' | 'ipv6'

export interface SubnetInfo {
  version: IpVersion
  cidr: string
  ip: string
  prefix: number
  network: string
  /** IPv4 only */
  broadcast?: string
  /** IPv4 only */
  subnetMask?: string
  /** IPv4 only */
  wildcardMask?: string
  firstHost: string
  lastHost: string
  /** number for IPv4, decimal string for IPv6 (BigInt) */
  totalHosts: number | string
  /** number for IPv4, decimal string for IPv6 (BigInt) */
  usableHosts: number | string
}

function fail(error: string): ConverterResult<never> {
  return { success: false, error }
}

function ipToNumber(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let num = 0
  for (const part of parts) {
    const n = parseInt(part, 10)
    if (!Number.isInteger(n) || n < 0 || n > 255) return null
    num = (num << 8) + n
  }
  return num >>> 0
}

function numberToIp(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255
  ].join('.')
}

function prefixToMask(prefix: number): number {
  if (prefix === 0) return 0
  return (0xffffffff << (32 - prefix)) >>> 0
}

const IPV6_MAX = (1n << 128n) - 1n

function ipv6PrefixMask(prefix: number): bigint {
  if (prefix === 0) return 0n
  if (prefix === 128) return IPV6_MAX
  return ((1n << BigInt(prefix)) - 1n) << BigInt(128 - prefix)
}

function parseIpv6Hextet(part: string): number | null {
  if (!/^[0-9a-fA-F]{1,4}$/.test(part)) return null
  return parseInt(part, 16)
}

/** Parse IPv6 address (incl. :: compression and trailing IPv4) to 128-bit BigInt */
export function parseIpv6Address(input: string): bigint | null {
  let addr = input.trim().toLowerCase()
  if (!addr) return null

  const v4Tail = addr.match(/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (v4Tail) {
    const v4Num = ipToNumber(v4Tail[2])
    if (v4Num === null) return null
    const hi = (v4Num >>> 16) & 0xffff
    const lo = v4Num & 0xffff
    addr = `${v4Tail[1]}${hi.toString(16)}:${lo.toString(16)}`
  }

  if (!/^[0-9a-f:]+$/.test(addr)) return null

  let hextets: string[]
  if (addr.includes('::')) {
    if (addr.indexOf('::') !== addr.lastIndexOf('::')) return null
    const [left, right] = addr.split('::')
    const leftParts = left ? left.split(':') : []
    const rightParts = right ? right.split(':') : []
    if (leftParts.length + rightParts.length > 7) return null
    const missing = 8 - leftParts.length - rightParts.length
    if (missing < 1) return null
    hextets = [...leftParts, ...Array(missing).fill('0'), ...rightParts]
  } else {
    hextets = addr.split(':')
    if (hextets.length !== 8) return null
  }

  if (hextets.length !== 8) return null

  let result = 0n
  for (const part of hextets) {
    if (part === '') return null
    const value = parseIpv6Hextet(part)
    if (value === null) return null
    result = (result << 16n) + BigInt(value)
  }
  return result
}

function hextetsFromBigInt(num: bigint): string[] {
  const hextets: string[] = []
  for (let i = 7; i >= 0; i--) {
    const hextet = Number((num >> BigInt(i * 16)) & 0xffffn)
    hextets.push(hextet.toString(16))
  }
  return hextets
}

/** RFC 5952 compress longest zero run (min length 2) */
export function compressIpv6(hextets: string[]): string {
  const normalized = hextets.map((h) => {
    const stripped = h.replace(/^0+(?!$)/, '') || '0'
    return stripped.toLowerCase()
  })

  let bestStart = -1
  let bestLen = 0
  for (let i = 0; i < 8; ) {
    if (normalized[i] === '0') {
      let j = i
      while (j < 8 && normalized[j] === '0') j++
      const len = j - i
      if (len > bestLen) {
        bestLen = len
        bestStart = i
      }
      i = j
    } else {
      i++
    }
  }

  if (bestLen >= 2) {
    const before = normalized.slice(0, bestStart).join(':')
    const after = normalized.slice(bestStart + bestLen).join(':')
    if (bestStart === 0 && bestStart + bestLen === 8) return '::'
    if (bestStart === 0) return `::${after}`
    if (bestStart + bestLen === 8) return `${before}::`
    return `${before}::${after}`
  }

  return normalized.join(':')
}

export function bigintToIpv6(num: bigint): string {
  return compressIpv6(hextetsFromBigInt(num & IPV6_MAX))
}

function pow2BigInt(exp: number): bigint {
  return 1n << BigInt(exp)
}

function parseIpv4Cidr(ip: string, prefix: number): ConverterResult<SubnetInfo> {
  if (prefix < 0 || prefix > 32) return fail('前缀长度必须在 0-32 之间')

  const ipNum = ipToNumber(ip)
  if (ipNum === null) return fail('IP 地址无效')

  const mask = prefixToMask(prefix)
  const wildcard = (~mask) >>> 0
  const network = (ipNum & mask) >>> 0
  const broadcast = (network | wildcard) >>> 0
  const totalHosts = prefix === 32 ? 1 : Math.pow(2, 32 - prefix)

  let firstHost: string
  let lastHost: string
  let usableHosts: number

  if (prefix >= 31) {
    firstHost = numberToIp(network)
    lastHost = numberToIp(broadcast)
    usableHosts = prefix === 31 ? 2 : 1
  } else {
    firstHost = numberToIp(network + 1)
    lastHost = numberToIp(broadcast - 1)
    usableHosts = totalHosts - 2
  }

  return {
    success: true,
    result: {
      version: 'ipv4',
      cidr: `${numberToIp(network)}/${prefix}`,
      ip,
      prefix,
      network: numberToIp(network),
      broadcast: numberToIp(broadcast),
      subnetMask: numberToIp(mask),
      wildcardMask: numberToIp(wildcard),
      firstHost,
      lastHost,
      totalHosts,
      usableHosts: Math.max(0, usableHosts)
    }
  }
}

function parseIpv6Cidr(ip: string, prefix: number): ConverterResult<SubnetInfo> {
  if (prefix < 0 || prefix > 128) return fail('前缀长度必须在 0-128 之间')

  const ipNum = parseIpv6Address(ip)
  if (ipNum === null) return fail('IPv6 地址无效')

  const mask = ipv6PrefixMask(prefix)
  const wildcard = (~mask) & IPV6_MAX
  const network = ipNum & mask
  const last = network | wildcard
  const hostBits = 128 - prefix
  const totalHosts = hostBits === 0 ? 1n : pow2BigInt(hostBits)

  let firstHostNum: bigint
  let lastHostNum: bigint
  let usableHosts: bigint

  if (prefix >= 127) {
    firstHostNum = network
    lastHostNum = last
    usableHosts = prefix === 127 ? 2n : 1n
  } else {
    firstHostNum = network + 1n
    lastHostNum = last - 1n
    usableHosts = totalHosts > 2n ? totalHosts - 2n : 0n
  }

  const networkStr = bigintToIpv6(network)

  return {
    success: true,
    result: {
      version: 'ipv6',
      cidr: `${networkStr}/${prefix}`,
      ip,
      prefix,
      network: networkStr,
      firstHost: bigintToIpv6(firstHostNum),
      lastHost: bigintToIpv6(lastHostNum),
      totalHosts: totalHosts.toString(),
      usableHosts: usableHosts.toString()
    }
  }
}

function detectVersion(addr: string): IpVersion | null {
  if (addr.includes(':')) return 'ipv6'
  if (addr.includes('.')) return 'ipv4'
  return null
}

export function parseCidr(input: string): ConverterResult<SubnetInfo> {
  const trimmed = input.trim()
  if (!trimmed) return fail('请输入 CIDR，例如 192.168.1.0/24')

  const slashIndex = trimmed.lastIndexOf('/')
  if (slashIndex <= 0 || slashIndex === trimmed.length - 1) {
    return fail('CIDR 格式无效，应为 IP/前缀长度，例如 192.168.1.0/24')
  }

  const addr = trimmed.slice(0, slashIndex)
  const prefixStr = trimmed.slice(slashIndex + 1)
  if (!/^\d{1,3}$/.test(prefixStr)) {
    return fail('CIDR 格式无效，应为 IP/前缀长度，例如 192.168.1.0/24')
  }
  const prefix = parseInt(prefixStr, 10)

  const version = detectVersion(addr)
  if (version === null) return fail('CIDR 格式无效，应为 IP/前缀长度，例如 192.168.1.0/24')

  if (version === 'ipv4') {
    if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(addr)) {
      return fail('CIDR 格式无效，应为 IP/前缀长度，例如 192.168.1.0/24')
    }
    return parseIpv4Cidr(addr, prefix)
  }

  return parseIpv6Cidr(addr, prefix)
}
