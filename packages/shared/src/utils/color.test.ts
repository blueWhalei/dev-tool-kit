import { describe, it, expect } from 'vitest'
import {
  hexToRgba,
  rgbaToHex,
  rgbaToHsla,
  hslaToRgba,
  rgbaToHsva,
  hsvaToRgba,
  evaluateWcagContrast,
  cssNameToRgba,
  rgbaToCssName,
  parseRgbString,
  parseHslString,
  rgbaToString,
  hslaToString
} from './color'

describe('hexToRgba', () => {
  it('parses 6-digit HEX', () => {
    expect(hexToRgba('#2563eb')).toEqual({ r: 37, g: 99, b: 235, a: 1 })
  })

  it('parses 3-digit HEX shorthand', () => {
    expect(hexToRgba('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 })
  })

  it('parses 8-digit HEX with alpha', () => {
    const result = hexToRgba('#ff000080')
    expect(result).not.toBeNull()
    expect(result!.r).toBe(255)
    expect(result!.g).toBe(0)
    expect(result!.b).toBe(0)
    expect(Math.abs(result!.a - 0.502)).toBeLessThan(0.01)
  })

  it('parses HEX without # prefix', () => {
    expect(hexToRgba('000000')).toEqual({ r: 0, g: 0, b: 0, a: 1 })
  })

  it('returns null for invalid input', () => {
    expect(hexToRgba('xyz')).toBeNull()
    expect(hexToRgba('#1234')).toBeNull()
  })
})

describe('rgbaToHex', () => {
  it('converts RGBA to 6-digit HEX', () => {
    expect(rgbaToHex({ r: 255, g: 0, b: 0, a: 1 })).toBe('#ff0000')
  })

  it('converts RGBA to 8-digit HEX with alpha', () => {
    expect(rgbaToHex({ r: 255, g: 0, b: 0, a: 0.5 }, true)).toBe('#ff000080')
  })
})

describe('rgbaToHsla / hslaToRgba roundtrip', () => {
  it('roundtrips pure red', () => {
    const rgba = { r: 255, g: 0, b: 0, a: 1 }
    const hsla = rgbaToHsla(rgba)
    const back = hslaToRgba(hsla)
    expect(back.r).toBe(255)
    expect(back.g).toBe(0)
    expect(back.b).toBe(0)
    expect(back.a).toBe(1)
  })

  it('roundtrips a mid-tone color', () => {
    const rgba = { r: 37, g: 99, b: 235, a: 1 }
    const hsla = rgbaToHsla(rgba)
    const back = hslaToRgba(hsla)
    expect(Math.abs(back.r - 37)).toBeLessThanOrEqual(1)
    expect(Math.abs(back.g - 99)).toBeLessThanOrEqual(1)
    expect(Math.abs(back.b - 235)).toBeLessThanOrEqual(1)
  })

  it('preserves alpha', () => {
    const rgba = { r: 100, g: 100, b: 100, a: 0.5 }
    const hsla = rgbaToHsla(rgba)
    expect(hsla.a).toBe(0.5)
    const back = hslaToRgba(hsla)
    expect(back.a).toBe(0.5)
  })

  it('handles grayscale (s=0)', () => {
    const rgba = { r: 128, g: 128, b: 128, a: 1 }
    const hsla = rgbaToHsla(rgba)
    const back = hslaToRgba(hsla)
    expect(Math.abs(back.r - 128)).toBeLessThanOrEqual(1)
    expect(Math.abs(back.g - 128)).toBeLessThanOrEqual(1)
    expect(Math.abs(back.b - 128)).toBeLessThanOrEqual(1)
  })
})

describe('cssNameToRgba', () => {
  it('resolves "red"', () => {
    expect(cssNameToRgba('red')).toEqual({ r: 255, g: 0, b: 0, a: 1 })
  })

  it('resolves "steelblue"', () => {
    expect(cssNameToRgba('steelblue')).toEqual({ r: 70, g: 130, b: 180, a: 1 })
  })

  it('is case insensitive', () => {
    expect(cssNameToRgba('SteelBlue')).toEqual(cssNameToRgba('steelblue'))
  })

  it('returns null for unknown name', () => {
    expect(cssNameToRgba('notacolor')).toBeNull()
  })
})

describe('rgbaToCssName', () => {
  it('finds name for pure red', () => {
    expect(rgbaToCssName({ r: 255, g: 0, b: 0, a: 1 })).toBe('red')
  })

  it('returns null for non-named color', () => {
    expect(rgbaToCssName({ r: 37, g: 99, b: 235, a: 1 })).toBeNull()
  })

  it('ignores alpha when matching', () => {
    expect(rgbaToCssName({ r: 255, g: 0, b: 0, a: 0.5 })).toBe('red')
  })
})

describe('parseRgbString', () => {
  it('parses "r, g, b" format', () => {
    expect(parseRgbString('37, 99, 235')).toEqual({ r: 37, g: 99, b: 235, a: 1 })
  })

  it('parses "rgba(r, g, b, a)" format', () => {
    const result = parseRgbString('rgba(255, 0, 0, 0.5)')
    expect(result).not.toBeNull()
    expect(result!.r).toBe(255)
    expect(result!.a).toBe(0.5)
  })

  it('returns null for invalid input', () => {
    expect(parseRgbString('not a color')).toBeNull()
  })
})

describe('parseHslString', () => {
  it('parses "h, s%, l%" format', () => {
    expect(parseHslString('217, 91%, 60%')).toEqual({ h: 217, s: 91, l: 60, a: 1 })
  })

  it('parses "hsla(h, s%, l%, a)" format', () => {
    const result = parseHslString('hsla(0, 100%, 50%, 0.5)')
    expect(result).not.toBeNull()
    expect(result!.h).toBe(0)
    expect(result!.a).toBe(0.5)
  })
})

describe('rgbaToString', () => {
  it('outputs rgb() when alpha=1', () => {
    expect(rgbaToString({ r: 255, g: 0, b: 0, a: 1 })).toBe('rgb(255, 0, 0)')
  })

  it('outputs rgba() when alpha<1', () => {
    expect(rgbaToString({ r: 255, g: 0, b: 0, a: 0.5 })).toBe('rgba(255, 0, 0, 0.50)')
  })
})

describe('hslaToString', () => {
  it('outputs hsl() when alpha=1', () => {
    expect(hslaToString({ h: 0, s: 100, l: 50, a: 1 })).toBe('hsl(0, 100%, 50%)')
  })

  it('outputs hsla() when alpha<1', () => {
    expect(hslaToString({ h: 0, s: 100, l: 50, a: 0.5 })).toBe('hsla(0, 100%, 50%, 0.50)')
  })
})

describe('HSV and WCAG', () => {
  it('converts rgba to hsva and back', () => {
    const rgba = { r: 255, g: 0, b: 0, a: 1 }
    const hsva = rgbaToHsva(rgba)
    expect(hsva.h).toBe(0)
    const back = hsvaToRgba(hsva)
    expect(back.r).toBe(255)
  })

  it('evaluates black on white contrast', () => {
    const fg = { r: 0, g: 0, b: 0, a: 1 }
    const bg = { r: 255, g: 255, b: 255, a: 1 }
    const result = evaluateWcagContrast(fg, bg)
    expect(result.aaNormal).toBe(true)
    expect(result.ratio).toBeGreaterThan(20)
  })
})
