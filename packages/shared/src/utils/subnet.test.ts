import { describe, it, expect } from 'vitest'
import { parseCidr, parseIpv6Address, compressIpv6, bigintToIpv6, splitVlsm } from './subnet'

describe('parseCidr IPv4', () => {
  it('calculates /24 subnet', () => {
    const result = parseCidr('192.168.1.0/24')
    expect(result.success).toBe(true)
    expect(result.result?.version).toBe('ipv4')
    expect(result.result?.network).toBe('192.168.1.0')
    expect(result.result?.broadcast).toBe('192.168.1.255')
    expect(result.result?.subnetMask).toBe('255.255.255.0')
    expect(result.result?.wildcardMask).toBe('0.0.0.255')
    expect(result.result?.firstHost).toBe('192.168.1.1')
    expect(result.result?.lastHost).toBe('192.168.1.254')
    expect(result.result?.totalHosts).toBe(256)
    expect(result.result?.usableHosts).toBe(254)
  })

  it('calculates /32 subnet', () => {
    const result = parseCidr('10.0.0.1/32')
    expect(result.success).toBe(true)
    expect(result.result?.network).toBe('10.0.0.1')
    expect(result.result?.totalHosts).toBe(1)
    expect(result.result?.usableHosts).toBe(1)
  })

  it('rejects invalid IPv4 CIDR', () => {
    expect(parseCidr('invalid').success).toBe(false)
    expect(parseCidr('256.1.1.1/24').success).toBe(false)
    expect(parseCidr('192.168.1.0/33').success).toBe(false)
  })
})

describe('parseIpv6Address', () => {
  it('parses full notation', () => {
    expect(parseIpv6Address('2001:0db8:0000:0000:0000:0000:0000:0001')).toBe(
      BigInt('0x20010db8000000000000000000000001')
    )
  })

  it('parses compressed :: notation', () => {
    expect(parseIpv6Address('2001:db8::1')).toBe(
      BigInt('0x20010db8000000000000000000000001')
    )
    expect(parseIpv6Address('::1')).toBe(1n)
    expect(parseIpv6Address('::')).toBe(0n)
    expect(parseIpv6Address('fe80::')).toBe(BigInt('0xfe800000000000000000000000000000'))
  })

  it('parses IPv4-mapped tail', () => {
    expect(parseIpv6Address('::ffff:192.0.2.1')).toBe(
      BigInt('0x00000000000000000000ffffc0000201')
    )
  })

  it('rejects invalid addresses', () => {
    expect(parseIpv6Address('')).toBeNull()
    expect(parseIpv6Address('gggg::1')).toBeNull()
    expect(parseIpv6Address('2001:db8::1::2')).toBeNull()
    expect(parseIpv6Address('2001:db8:1')).toBeNull()
  })
})

describe('compressIpv6 / bigintToIpv6', () => {
  it('compresses longest zero run', () => {
    expect(compressIpv6(['2001', 'db8', '0', '0', '0', '0', '0', '1'])).toBe('2001:db8::1')
    expect(compressIpv6(['0', '0', '0', '0', '0', '0', '0', '1'])).toBe('::1')
    expect(compressIpv6(['0', '0', '0', '0', '0', '0', '0', '0'])).toBe('::')
  })

  it('formats from bigint', () => {
    expect(bigintToIpv6(BigInt('0x20010db8000000000000000000000001'))).toBe('2001:db8::1')
  })
})

describe('parseCidr IPv6', () => {
  it('calculates /32 subnet', () => {
    const result = parseCidr('2001:db8::/32')
    expect(result.success).toBe(true)
    expect(result.result?.version).toBe('ipv6')
    expect(result.result?.network).toBe('2001:db8::')
    expect(result.result?.prefix).toBe(32)
    expect(result.result?.cidr).toBe('2001:db8::/32')
    expect(result.result?.broadcast).toBeUndefined()
    expect(result.result?.subnetMask).toBeUndefined()
    expect(result.result?.totalHosts).toBe('79228162514264337593543950336')
    expect(result.result?.usableHosts).toBe('79228162514264337593543950334')
  })

  it('calculates /128 subnet', () => {
    const result = parseCidr('2001:db8::1/128')
    expect(result.success).toBe(true)
    expect(result.result?.network).toBe('2001:db8::1')
    expect(result.result?.firstHost).toBe('2001:db8::1')
    expect(result.result?.lastHost).toBe('2001:db8::1')
    expect(result.result?.totalHosts).toBe('1')
    expect(result.result?.usableHosts).toBe('1')
  })

  it('calculates /127 subnet', () => {
    const result = parseCidr('2001:db8::/127')
    expect(result.success).toBe(true)
    expect(result.result?.totalHosts).toBe('2')
    expect(result.result?.usableHosts).toBe('2')
  })

  it('calculates /64 with compressed input', () => {
    const result = parseCidr('fe80::1/64')
    expect(result.success).toBe(true)
    expect(result.result?.network).toBe('fe80::')
    expect(result.result?.firstHost).toBe('fe80::1')
    expect(result.result?.totalHosts).toBe('18446744073709551616')
  })

  it('rejects invalid IPv6 CIDR', () => {
    expect(parseCidr('2001:db8::/129').success).toBe(false)
    expect(parseCidr('not-v6::1/64').success).toBe(false)
    expect(parseCidr('2001:db8::1/abc').success).toBe(false)
  })
})

describe('splitVlsm', () => {
  it('splits 192.168.1.0/24 into subnets by host count', () => {
    const result = splitVlsm('192.168.1.0/24', [50, 20, 10])
    expect(result.success).toBe(true)
    if (!result.success || !result.result) return
    expect(result.result).toHaveLength(3)
    expect(result.result[0].usableHosts).toBeGreaterThanOrEqual(50)
    expect(result.result[0].cidr).toBe('192.168.1.0/26')
  })

  it('rejects when subnets exceed parent range', () => {
    const result = splitVlsm('192.168.1.0/30', [100, 100])
    expect(result.success).toBe(false)
  })

  it('rejects IPv6', () => {
    const result = splitVlsm('2001:db8::/64', [10])
    expect(result.success).toBe(false)
  })
})
