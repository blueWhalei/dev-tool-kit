import type { ConverterResult } from './converter'

export interface SubnetInfo {
  cidr: string
  ip: string
  prefix: number
  network: string
  broadcast: string
  subnetMask: string
  wildcardMask: string
  firstHost: string
  lastHost: string
  totalHosts: number
  usableHosts: number
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

export function parseCidr(input: string): ConverterResult<SubnetInfo> {
  const trimmed = input.trim()
  if (!trimmed) return fail('请输入 CIDR，例如 192.168.1.0/24')

  const match = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/)
  if (!match) return fail('CIDR 格式无效，应为 IP/前缀长度，例如 192.168.1.0/24')

  const ip = match[1]
  const prefix = parseInt(match[2], 10)

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
