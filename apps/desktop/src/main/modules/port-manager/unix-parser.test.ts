import { expect, it } from 'vitest'
import { parseMacLsof, parseLinuxNetstat } from './unix-parser'
it('extracts macOS TCP and UDP protocols including IPv6', () => {
  const ports = parseMacLsof(
    'node 123 user 22u IPv4 0x0 0t0 TCP 127.0.0.1:3000 (LISTEN)\nnode 124 user 23u IPv6 0x0 0t0 UDP [::1]:5353'
  )
  expect(ports).toMatchObject([
    { protocol: 'TCP', port: 3000, pid: 123 },
    { protocol: 'UDP', port: 5353, pid: 124 }
  ])
})
it('accounts for the absent UDP state column in Linux netstat', () => {
  expect(
    parseLinuxNetstat('udp6 0 0 :::5353 :::* 124/avahi\ntcp6 0 0 :::3000 :::* LISTEN 123/node')
  ).toMatchObject([
    { protocol: 'UDP', pid: 124, state: 'UNCONN' },
    { protocol: 'TCP', pid: 123, state: 'LISTEN' }
  ])
})
