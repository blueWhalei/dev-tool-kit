export default {
  title: 'Color Converter',
  description: 'Convert between HEX, RGBA, HSLA and other color formats',
  labels: {
    hex: 'HEX',
    rgb: 'RGB',
    hsl: 'HSL',
    rgba: 'RGBA',
    hsla: 'HSLA',
    hex8: 'HEX8',
    cssName: 'CSS Name',
    alpha: 'Alpha',
    pickColor: 'Pick color',
    recentColors: 'Recent'
  },
  placeholders: {
    hex: '#000000 or #000',
    rgba: '0, 0, 0, 1',
    hsla: '0, 0%, 0%, 1',
    hex8: '#000000FF',
    cssName: 'red / coral / steelblue'
  },
  buttons: {
    copy: 'Copy'
  },
  messages: {
    hexCopied: 'HEX copied',
    rgbaCopied: 'RGBA copied',
    hslaCopied: 'HSLA copied',
    hex8Copied: 'HEX8 copied',
    cssNameCopied: 'CSS name copied',
    noCssName: 'No matching CSS color name'
  }
}
