import { describe, it, expect } from 'vitest'
import { routes } from '../router'

describe('routes smoke', () => {
  it('has unique route names', () => {
    const names = routes
      .map(route => route.name)
      .filter((name): name is string => typeof name === 'string')
    expect(new Set(names).size).toBe(names.length)
  })

  it('visible tool routes have complete meta', () => {
    const toolRoutes = routes.filter(
      route => route.meta?.titleKey && route.meta?.category && !route.meta?.hidden
    )
    expect(toolRoutes.length).toBeGreaterThan(10)
    for (const route of toolRoutes) {
      expect(route.meta?.icon).toBeTruthy()
      expect(typeof route.meta?.order).toBe('number')
      expect(route.component || route.redirect).toBeTruthy()
    }
  })

  it('default home candidates exclude hidden pages', () => {
    const hiddenNames = new Set(
      routes.filter(route => route.meta?.hidden).map(route => route.name)
    )
    expect(hiddenNames.has('Settings')).toBe(true)
    expect(hiddenNames.has('About')).toBe(true)
  })
})
