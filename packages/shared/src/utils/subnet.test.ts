import { describe, it, expect } from 'vitest'
import { parseCidr } from './subnet'

describe('parseCidr', () => {
  it('calculates /24 subnet', () => {
    const result = parseCidr('192.168.1.0/24')
    expect(result.success).toBe(true)
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

  it('rejects invalid CIDR', () => {
    expect(parseCidr('invalid').success).toBe(false)
    expect(parseCidr('256.1.1.1/24').success).toBe(false)
    expect(parseCidr('192.168.1.0/33').success).toBe(false)
  })
})
