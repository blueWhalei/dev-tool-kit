import { describe, it, expect } from 'vitest'
import { parseShellEnvContent, splitUnixPath, joinUnixPath } from './shell-env'

describe('parseShellEnvContent', () => {
  it('parses export and plain assignments', () => {
    const content = `
# comment
export NODE_ENV=production
API_URL="http://localhost:3000"
DEBUG='yes'
PATH=$PATH:/usr/local/bin
`
    const vars = parseShellEnvContent(content)
    expect(vars).toEqual([
      { name: 'NODE_ENV', value: 'production', line: 3 },
      { name: 'API_URL', value: 'http://localhost:3000', line: 4 },
      { name: 'DEBUG', value: 'yes', line: 5 },
      { name: 'PATH', value: '$PATH:/usr/local/bin', line: 6 }
    ])
  })

  it('strips inline comments outside quotes', () => {
    const vars = parseShellEnvContent('export FOO=bar # trailing comment')
    expect(vars).toEqual([{ name: 'FOO', value: 'bar', line: 1 }])
  })

  it('ignores non-assignment lines', () => {
    const vars = parseShellEnvContent('if [ -f ~/.profile ]; then\n  source ~/.profile\nfi')
    expect(vars).toHaveLength(0)
  })
})

describe('splitUnixPath', () => {
  it('splits colon-separated paths', () => {
    expect(splitUnixPath('/usr/bin:/usr/local/bin:')).toEqual(['/usr/bin', '/usr/local/bin'])
  })
})

describe('joinUnixPath', () => {
  it('joins non-empty paths', () => {
    expect(joinUnixPath(['/a', '', '/b'])).toBe('/a:/b')
  })
})
