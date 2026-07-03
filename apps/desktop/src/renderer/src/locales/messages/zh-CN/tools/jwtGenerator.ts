export default {
    title: 'JWT 工具',
    description: '生成、解码与验证 JSON Web Token',
    tabs: {
      generate: '生成',
      decode: '解码'
    },
    labels: {
      secretLength: '密钥长度',
      recommended: '推荐: {algorithm}',
      generatedSecret: '生成的 Secret',
      jwtToken: 'JWT Token',
      header: 'Header',
      payload: 'Payload',
      hmacVerify: 'HMAC 验签（可选）',
      issuedAt: '签发: {date}',
      expiresAt: '过期: {date}',
      remainingDays: '剩余 {days} 天',
      secretMatch: 'Secret 匹配'
    },
    placeholders: {
      jwtToken: '粘贴 JWT Token，输入后自动解码...',
      verifySecret: '输入 Secret 验证签名...'
    },
    buttons: {
      generateSecret: '生成 Secret',
      copy: '复制',
      copied: '已复制',
      fillSample: '填入示例',
      decodeNow: '立即解码',
      verify: '验签'
    },
    secretLengths: {
      hs128: '128 位 (HS128)',
      hs256: '256 位 (HS256)',
      hs512: '512 位 (HS512)'
    },
    messages: {
      copied: '已复制到剪贴板',
      copiedPart: '已复制',
      tokenExpired: 'Token 已过期',
      expiredAt: '过期时间: {date}',
      signatureValid: '签名有效',
      signatureInvalid: '签名无效'
    },
    errors: {
      decodeFailed: '解码失败',
      invalidBase64Url: '无效的 Base64URL 编码',
      tokenEmpty: '请输入 JWT Token',
      secretEmpty: '请输入 Secret 以验签'
    },
    empty: {
      secret: '点击「生成 Secret」开始'
    }
  }
