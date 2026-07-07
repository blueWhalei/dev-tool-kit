export default {
  title: '密钥对生成',
  description: '本地生成 RSA / EC 密钥对，导出 PEM 格式公钥与私钥',
  labels: {
    algorithm: '算法',
    keyType: '密钥类型',
    publicKey: '公钥 (PEM)',
    privateKey: '私钥 (PEM)'
  },
  algorithms: {
    'rsa-2048': 'RSA 2048',
    'rsa-4096': 'RSA 4096',
    'ec-p256': 'EC P-256',
    'ec-p384': 'EC P-384'
  },
  buttons: {
    generate: '生成密钥对',
    regenerate: '重新生成',
    useInJwt: '用于 JWT 验签'
  },
  messages: {
    copied: '已复制到剪贴板',
    generateFailed: '密钥生成失败',
    noKeys: '请先生成密钥对'
  },
  errors: {
    invalid_algorithm: '不支持的算法',
    generate_failed: '密钥生成失败'
  },
  empty: '选择算法后点击「生成密钥对」'
}
