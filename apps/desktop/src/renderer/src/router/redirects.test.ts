import { describe, it, expect } from 'vitest'
import { routes } from './index'

type RedirectTarget = { path: string; query?: { tab: string } }

function getRedirect(path: string): RedirectTarget | undefined {
  const route = routes.find(r => r.path === path)
  if (!route?.redirect || typeof route.redirect === 'string') return undefined
  return route.redirect as RedirectTarget
}

describe('encode route redirects', () => {
  it('redirects /base64 to code-converter?tab=base64', () => {
    expect(getRedirect('/base64')).toEqual({
      path: '/code-converter',
      query: { tab: 'base64' }
    })
  })

  it('redirects /url to code-converter?tab=url', () => {
    expect(getRedirect('/url')).toEqual({
      path: '/code-converter',
      query: { tab: 'url' }
    })
  })

  it('redirects /json-formatter to code-converter?tab=json', () => {
    expect(getRedirect('/json-formatter')).toEqual({
      path: '/code-converter',
      query: { tab: 'json' }
    })
  })

  it('redirects /timestamp to code-converter?tab=timestamp', () => {
    expect(getRedirect('/timestamp')).toEqual({
      path: '/code-converter',
      query: { tab: 'timestamp' }
    })
  })

  it('redirects /yaml to code-converter?tab=yaml', () => {
    expect(getRedirect('/yaml')).toEqual({
      path: '/code-converter',
      query: { tab: 'yaml' }
    })
  })

  it('redirects /toml to code-converter?tab=toml', () => {
    expect(getRedirect('/toml')).toEqual({
      path: '/code-converter',
      query: { tab: 'toml' }
    })
  })
})
