import type { PortTarget } from '../types'
import { isValidIP } from './network-validation'

export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

export function normalizePortAddress(value: string): string | null {
  const plain = value.replace(/^\[([^\]]+)\]$/, '$1')
  const [ip, zone, ...rest] = plain.split('%')
  if (
    !isValidIP(ip) ||
    rest.length ||
    (zone !== undefined && (!ip.includes(':') || !/^[\w.-]+$/.test(zone)))
  )
    return null
  if (!ip.includes(':')) return ip
  try {
    const canonical = new URL('http://[' + ip + ']/').hostname.slice(1, -1)
    return zone ? canonical + '%' + zone : canonical
  } catch {
    return null
  }
}

export function parsePortDiagnosisInput(input: string): PortTarget | null {
  const text = input.trim()
  if (/^\d{1,5}$/.test(text)) return isValidPort(Number(text)) ? { port: Number(text) } : null
  if (
    text.length > 32768 ||
    !/\bEADDRINUSE\b/i.test(text) ||
    /\b(?:bind|connect)\s+EADDRINUSE\b|['"]?syscall['"]?\s*:\s*['"](?:bind|connect)['"]|\budp[46]?\b/i.test(
      text
    )
  )
    return null
  if (/(?:^|[{\s,])['"]?address['"]?\s*:\s*(?![\s'"])/i.test(text)) return null
  const ports = new Set<number>()
  const addresses = new Set<string | null>()
  for (const line of text.split(/\r?\n/)) {
    const endpoint = line.match(
      /\bEADDRINUSE\b(?:\s*:\s*address already in use)?\s+([^\s]+):(\d+)\s*$/i
    )
    if (!endpoint && /\bEADDRINUSE\s*:\s*address already in use\s+\S/i.test(line)) return null
    if (endpoint) {
      ports.add(Number(endpoint[2]))
      addresses.add(normalizePortAddress(endpoint[1]))
    }
  }
  for (const field of text.matchAll(/(?:^|[{\s,])['"]?port['"]?\s*:\s*(\d+)(?=\s*[,}\r\n]|$)/gi))
    ports.add(Number(field[1]))
  for (const field of text.matchAll(/(?:^|[{\s,])['"]?address['"]?\s*:\s*['"]([^'"]*)['"]/gi))
    addresses.add(normalizePortAddress(field[1]))
  const [port] = ports
  if (ports.size !== 1 || !isValidPort(port) || addresses.size > 1 || addresses.has(null))
    return null
  const [address] = addresses
  return address ? { port, address } : { port }
}
