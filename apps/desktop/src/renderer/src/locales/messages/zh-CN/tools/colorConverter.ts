export default {
  title: '颜色转换器',
  description: '在 HEX、RGBA、HSLA 等格式之间转换颜色',
  labels: {
    hex: 'HEX',
    rgb: 'RGB',
    hsl: 'HSL',
    rgba: 'RGBA',
    hsla: 'HSLA',
    hex8: 'HEX8',
    cssName: 'CSS 颜色名',
    alpha: '透明度',
    pickColor: '选择颜色',
    recentColors: '最近使用'
  },
  placeholders: {
    hex: '#000000 或 #000',
    rgba: '0, 0, 0, 1',
    hsla: '0, 0%, 0%, 1',
    hex8: '#000000FF',
    cssName: 'red / coral / steelblue'
  },
  buttons: {
    copy: '复制'
  },
  messages: {
    hexCopied: 'HEX 已复制',
    rgbaCopied: 'RGBA 已复制',
    hslaCopied: 'HSLA 已复制',
    hex8Copied: 'HEX8 已复制',
    cssNameCopied: 'CSS 颜色名已复制',
    noCssName: '无对应 CSS 颜色名'
  }
}
