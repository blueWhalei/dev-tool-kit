import { expect, it } from 'vitest'
import { parsePortDiagnosisInput } from './port'

it.each([
  [' 5173 ', { port: 5173 }],
  [
    'Error: listen EADDRINUSE: address already in use :::3000\n    at fn (app.js:12:42)',
    { port: 3000, address: '::' }
  ],
  ['listen EADDRINUSE: address already in use [::1]:8080', { port: 8080, address: '::1' }],
  ['Error: listen EADDRINUSE 127.0.0.1:65535', { port: 65535, address: '127.0.0.1' }],
  ['{"code":"EADDRINUSE","port":4000}', { port: 4000 }],
  ['EADDRINUSE\n  port: 3000\n', { port: 3000 }],
  ['EADDRINUSE: address already in use /tmp/app.sock\n at fn (app.js:12:89)', null],
  ['EADDRINUSE: address already in use :::3000\nport: 3001', null],
  ['bind EADDRINUSE 127.0.0.1:5353', null],
  ['Error: ECONNREFUSED 127.0.0.1:3306', null],
  ['65536', null],
  ['listen EADDRINUSE 127.0.0.1:3000\naddress: "::1", port: 3000', null],
  ['listen EADDRINUSE localhost:3000', null],
  ['connect EADDRINUSE 127.0.0.1:6789', null],
  ['listen EADDRINUSE: address already in use /tmp/app.sock\nport: 3000', null],
  ['listen EADDRINUSE: address already in use [1:2:3:4:5:6:7:8:]:3000', null],
  ['0', null],
  ['3000abc', null]
])('parses %s', (input, expected) =>
  expect(parsePortDiagnosisInput(String(input))).toEqual(expected)
)
