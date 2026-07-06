export interface ColorHSVA {
  h: number
  s: number
  v: number
  a: number
}

export interface WcagContrastResult {
  ratio: number
  ratioFormatted: string
  aaNormal: boolean
  aaLarge: boolean
  aaaNormal: boolean
  aaaLarge: boolean
}

export interface ColorRGBA {
  r: number
  g: number
  b: number
  a: number
}

export interface ColorHSLA {
  h: number
  s: number
  l: number
  a: number
}

export function hexToRgba(hex: string): ColorRGBA | null {
  const cleaned = hex.trim().replace(/^#/, '')
  let r: number, g: number, b: number, a = 1

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16)
    g = parseInt(cleaned[1] + cleaned[1], 16)
    b = parseInt(cleaned[2] + cleaned[2], 16)
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.slice(0, 2), 16)
    g = parseInt(cleaned.slice(2, 4), 16)
    b = parseInt(cleaned.slice(4, 6), 16)
  } else if (cleaned.length === 8) {
    r = parseInt(cleaned.slice(0, 2), 16)
    g = parseInt(cleaned.slice(2, 4), 16)
    b = parseInt(cleaned.slice(4, 6), 16)
    a = parseInt(cleaned.slice(6, 8), 16) / 255
  } else {
    return null
  }

  if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) return null
  return { r: Math.min(255, Math.max(0, r)), g: Math.min(255, Math.max(0, g)), b: Math.min(255, Math.max(0, b)), a: Math.min(1, Math.max(0, a)) }
}

export function rgbaToHex(rgba: ColorRGBA, includeAlpha = false): string {
  const r = Math.round(rgba.r).toString(16).padStart(2, '0')
  const g = Math.round(rgba.g).toString(16).padStart(2, '0')
  const b = Math.round(rgba.b).toString(16).padStart(2, '0')
  if (includeAlpha) {
    const a = Math.round(rgba.a * 255).toString(16).padStart(2, '0')
    return `#${r}${g}${b}${a}`
  }
  return `#${r}${g}${b}`
}

export function rgbaToHsla(rgba: ColorRGBA): ColorHSLA {
  const r = rgba.r / 255
  const g = rgba.g / 255
  const b = rgba.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100), a: rgba.a }
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

export function hslaToRgba(hsla: ColorHSLA): ColorRGBA {
  const h = hsla.h / 360
  const s = hsla.s / 100
  const l = hsla.l / 100

  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v, a: hsla.a }
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = hue2rgb(p, q, h + 1 / 3)
  const g = hue2rgb(p, q, h)
  const b = hue2rgb(p, q, h - 1 / 3)

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a: hsla.a }
}

export const CSS_NAMED_COLORS: Map<string, string> = new Map([
  ['aliceblue', '#f0f8ff'], ['antiquewhite', '#faebd7'], ['aqua', '#00ffff'],
  ['aquamarine', '#7fffd4'], ['azure', '#f0ffff'], ['beige', '#f5f5dc'],
  ['bisque', '#ffe4c4'], ['black', '#000000'], ['blanchedalmond', '#ffebcd'],
  ['blue', '#0000ff'], ['blueviolet', '#8a2be2'], ['brown', '#a52a2a'],
  ['burlywood', '#deb887'], ['cadetblue', '#5f9ea0'], ['chartreuse', '#7fff00'],
  ['chocolate', '#d2691e'], ['coral', '#ff7f50'], ['cornflowerblue', '#6495ed'],
  ['cornsilk', '#fff8dc'], ['crimson', '#dc143c'], ['cyan', '#00ffff'],
  ['darkblue', '#00008b'], ['darkcyan', '#008b8b'], ['darkgoldenrod', '#b8860b'],
  ['darkgray', '#a9a9a9'], ['darkgreen', '#006400'], ['darkkhaki', '#bdb76b'],
  ['darkmagenta', '#8b008b'], ['darkolivegreen', '#556b2f'], ['darkorange', '#ff8c00'],
  ['darkorchid', '#9932cc'], ['darkred', '#8b0000'], ['darksalmon', '#e9967a'],
  ['darkseagreen', '#8fbc8f'], ['darkslateblue', '#483d8b'], ['darkslategray', '#2f4f4f'],
  ['darkturquoise', '#00ced1'], ['darkviolet', '#9400d3'], ['deeppink', '#ff1493'],
  ['deepskyblue', '#00bfff'], ['dimgray', '#696969'], ['dodgerblue', '#1e90ff'],
  ['firebrick', '#b22222'], ['floralwhite', '#fffaf0'], ['forestgreen', '#228b22'],
  ['fuchsia', '#ff00ff'], ['gainsboro', '#dcdcdc'], ['ghostwhite', '#f8f8ff'],
  ['gold', '#ffd700'], ['goldenrod', '#daa520'], ['gray', '#808080'],
  ['green', '#008000'], ['greenyellow', '#adff2f'], ['honeydew', '#f0fff0'],
  ['hotpink', '#ff69b4'], ['indianred', '#cd5c5c'], ['indigo', '#4b0082'],
  ['ivory', '#fffff0'], ['khaki', '#f0e68c'], ['lavender', '#e6e6fa'],
  ['lavenderblush', '#fff0f5'], ['lawngreen', '#7cfc00'], ['lemonchiffon', '#fffacd'],
  ['lightblue', '#add8e6'], ['lightcoral', '#f08080'], ['lightcyan', '#e0ffff'],
  ['lightgoldenrodyellow', '#fafad2'], ['lightgray', '#d3d3d3'], ['lightgreen', '#90ee90'],
  ['lightpink', '#ffb6c1'], ['lightsalmon', '#ffa07a'], ['lightseagreen', '#20b2aa'],
  ['lightskyblue', '#87cefa'], ['lightslategray', '#778899'], ['lightsteelblue', '#b0c4de'],
  ['lightyellow', '#ffffe0'], ['lime', '#00ff00'], ['limegreen', '#32cd32'],
  ['linen', '#faf0e6'], ['magenta', '#ff00ff'], ['maroon', '#800000'],
  ['mediumaquamarine', '#66cdaa'], ['mediumblue', '#0000cd'], ['mediumorchid', '#ba55d3'],
  ['mediumpurple', '#9370db'], ['mediumseagreen', '#3cb371'], ['mediumslateblue', '#7b68ee'],
  ['mediumspringgreen', '#00fa9a'], ['mediumturquoise', '#48d1cc'], ['mediumvioletred', '#c71585'],
  ['midnightblue', '#191970'], ['mintcream', '#f5fffa'], ['mistyrose', '#ffe4e1'],
  ['moccasin', '#ffe4b5'], ['navajowhite', '#ffdead'], ['navy', '#000080'],
  ['oldlace', '#fdf5e6'], ['olive', '#808000'], ['olivedrab', '#6b8e23'],
  ['orange', '#ffa500'], ['orangered', '#ff4500'], ['orchid', '#da70d6'],
  ['palegoldenrod', '#eee8aa'], ['palegreen', '#98fb98'], ['paleturquoise', '#afeeee'],
  ['palevioletred', '#db7093'], ['papayawhip', '#ffefd5'], ['peachpuff', '#ffdab9'],
  ['peru', '#cd853f'], ['pink', '#ffc0cb'], ['plum', '#dda0dd'],
  ['powderblue', '#b0e0e6'], ['purple', '#800080'], ['rebeccapurple', '#663399'],
  ['red', '#ff0000'], ['rosybrown', '#bc8f8f'], ['royalblue', '#4169e1'],
  ['saddlebrown', '#8b4513'], ['salmon', '#fa8072'], ['sandybrown', '#f4a460'],
  ['seagreen', '#2e8b57'], ['seashell', '#fff5ee'], ['sienna', '#a0522d'],
  ['silver', '#c0c0c0'], ['skyblue', '#87ceeb'], ['slateblue', '#6a5acd'],
  ['slategray', '#708090'], ['snow', '#fffafa'], ['springgreen', '#00ff7f'],
  ['steelblue', '#4682b4'], ['tan', '#d2b48c'], ['teal', '#008080'],
  ['thistle', '#d8bfd8'], ['tomato', '#ff6347'], ['turquoise', '#40e0d0'],
  ['violet', '#ee82ee'], ['wheat', '#f5deb3'], ['white', '#ffffff'],
  ['whitesmoke', '#f5f5f5'], ['yellow', '#ffff00'], ['yellowgreen', '#9acd32']
])

export function cssNameToRgba(name: string): ColorRGBA | null {
  const hex = CSS_NAMED_COLORS.get(name.trim().toLowerCase())
  if (!hex) return null
  return hexToRgba(hex)
}

export function rgbaToCssName(rgba: ColorRGBA): string | null {
  const targetHex = rgbaToHex({ ...rgba, a: 1 }).toLowerCase()
  for (const [name, hex] of CSS_NAMED_COLORS) {
    if (hex.toLowerCase() === targetHex) return name
  }
  return null
}

export function parseRgbString(input: string): ColorRGBA | null {
  const cleaned = input.trim()
  const match = cleaned.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i)
    || cleaned.match(/^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?$/)
  if (!match) return null
  const r = parseInt(match[1])
  const g = parseInt(match[2])
  const b = parseInt(match[3])
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1
  if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) return null
  return { r: Math.min(255, Math.max(0, r)), g: Math.min(255, Math.max(0, g)), b: Math.min(255, Math.max(0, b)), a: Math.min(1, Math.max(0, a)) }
}

export function parseHslString(input: string): ColorHSLA | null {
  const cleaned = input.trim()
  const match = cleaned.match(/^hsla?\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*(?:,\s*([\d.]+)\s*)?\)$/i)
    || cleaned.match(/^(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*(?:,\s*([\d.]+)\s*)?$/)
  if (!match) return null
  const h = parseInt(match[1])
  const s = parseInt(match[2])
  const l = parseInt(match[3])
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1
  if (isNaN(h) || isNaN(s) || isNaN(l) || isNaN(a)) return null
  return { h: Math.min(360, Math.max(0, h)), s: Math.min(100, Math.max(0, s)), l: Math.min(100, Math.max(0, l)), a: Math.min(1, Math.max(0, a)) }
}

export function rgbaToString(rgba: ColorRGBA): string {
  if (rgba.a < 1) {
    return `rgba(${Math.round(rgba.r)}, ${Math.round(rgba.g)}, ${Math.round(rgba.b)}, ${rgba.a.toFixed(2)})`
  }
  return `rgb(${Math.round(rgba.r)}, ${Math.round(rgba.g)}, ${Math.round(rgba.b)})`
}

export function hslaToString(hsla: ColorHSLA): string {
  if (hsla.a < 1) {
    return `hsla(${hsla.h}, ${hsla.s}%, ${hsla.l}%, ${hsla.a.toFixed(2)})`
  }
  return `hsl(${hsla.h}, ${hsla.s}%, ${hsla.l}%)`
}

export function rgbaToHsva(rgba: ColorRGBA): ColorHSVA {
  const r = rgba.r / 255
  const g = rgba.g / 255
  const b = rgba.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const v = max
  const s = max === 0 ? 0 : d / max

  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100), a: rgba.a }
}

export function hsvaToRgba(hsva: ColorHSVA): ColorRGBA {
  const h = hsva.h / 360
  const s = hsva.s / 100
  const v = hsva.v / 100

  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  let r = 0
  let g = 0
  let b = 0
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: hsva.a
  }
}

export function hsvaToString(hsva: ColorHSVA): string {
  if (hsva.a < 1) {
    return `hsva(${hsva.h}, ${hsva.s}%, ${hsva.v}%, ${hsva.a.toFixed(2)})`
  }
  return `hsv(${hsva.h}, ${hsva.s}%, ${hsva.v}%)`
}

function linearizeChannel(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(rgba: ColorRGBA): number {
  const r = linearizeChannel(rgba.r)
  const g = linearizeChannel(rgba.g)
  const b = linearizeChannel(rgba.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function wcagContrastRatio(foreground: ColorRGBA, background: ColorRGBA): number {
  const l1 = relativeLuminance(foreground)
  const l2 = relativeLuminance(background)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function evaluateWcagContrast(foreground: ColorRGBA, background: ColorRGBA): WcagContrastResult {
  const ratio = wcagContrastRatio(foreground, background)
  return {
    ratio,
    ratioFormatted: ratio.toFixed(2),
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5
  }
}
