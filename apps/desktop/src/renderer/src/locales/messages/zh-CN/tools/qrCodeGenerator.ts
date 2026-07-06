export default {
  title: '二维码生成',
  description: '从文本或 URL 本地生成二维码，完全离线',
  labels: {
    text: '内容',
    size: '尺寸 (px)',
    errorLevel: '纠错级别',
    margin: '边距'
  },
  placeholders: {
    text: '输入文本或 URL...'
  },
  errorLevels: {
    L: 'L (低 ~7%)',
    M: 'M (中 ~15%)',
    Q: 'Q (较高 ~25%)',
    H: 'H (高 ~30%)'
  },
  buttons: {
    download: '下载 PNG',
    copyImage: '复制图片'
  },
  messages: {
    copiedImage: '图片已复制',
    copyImageFailed: '复制图片失败，请尝试下载',
    emptyText: '请输入内容以生成二维码'
  }
}
