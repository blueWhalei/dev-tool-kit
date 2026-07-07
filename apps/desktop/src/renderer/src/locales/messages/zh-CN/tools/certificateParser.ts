export default {
  title: '证书解析',
  description: '离线解析 X.509 PEM 证书，查看主题、颁发者、有效期与公钥信息',
  input: 'PEM 证书',
  inputPlaceholder: '粘贴 PEM 证书内容（-----BEGIN CERTIFICATE-----）...',
  buttons: {
    loadFile: '加载证书文件',
    parse: '解析',
    useInJwt: '用于 JWT 验签'
  },
  labels: {
    subject: '主题 (Subject)',
    issuer: '颁发者 (Issuer)',
    validFrom: '生效时间',
    validTo: '过期时间',
    daysUntilExpiry: '剩余天数',
    serialNumber: '序列号',
    subjectAltNames: 'SAN（备用名称）',
    signatureAlgorithm: '签名算法',
    publicKeyType: '公钥类型',
    publicKeyBits: '公钥长度',
    publicKeyCurve: '椭圆曲线',
    fingerprint: '指纹 (SHA-1)',
    fingerprint256: '指纹 (SHA-256)',
    certificate: '证书',
    noSan: '无',
    expired: '已过期',
    notYetValid: '尚未生效',
    expiringSoon: '即将过期（30 天内）',
    valid: '有效'
  },
  messages: {
    loadFileFailed: '证书文件读取失败',
    parseFailed: '证书解析失败',
    noInput: '请输入或加载 PEM 证书',
    copied: '已复制',
    noPublicKey: '无法导出公钥 PEM'
  },
  errors: {
    pemEmpty: '请输入 PEM 证书内容',
    pemNotFound: '未找到有效的 PEM 证书块'
  }
}
