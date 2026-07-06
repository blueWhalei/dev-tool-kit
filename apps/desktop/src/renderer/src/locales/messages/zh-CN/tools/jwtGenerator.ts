export default {
    title: 'JWT 工具',
    description: '生成、解码与验证 JSON Web Token',
    tabs: {
      generate: '生成 Secret',
      sign: '签发 Token',
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
      rsaVerify: 'RSA 公钥验签（可选，RS256/384/512）',
      issuedAt: '签发: {date}',
      expiresAt: '过期: {date}',
      remainingDays: '剩余 {days} 天',
      secretMatch: 'Secret 匹配',
      algorithm: '签名算法',
      signSecret: '签名 Secret',
      signedToken: '签发的 Token'
    },
    placeholders: {
      jwtToken: '粘贴 JWT Token，输入后自动解码...',
      verifySecret: '输入 Secret 验证签名...',
      verifyPublicKey: '粘贴 RSA 公钥 PEM（-----BEGIN PUBLIC KEY-----）...',
      signHeader: 'JWT Header JSON',
      signPayload: 'JWT Payload JSON',
      signSecret: '输入用于签名的 Secret...'
    },
    buttons: {
      generateSecret: '生成 Secret',
      copy: '复制',
      copied: '已复制',
      fillSample: '填入示例',
      fillSignSample: '填入示例',
      decodeNow: '立即解码',
      verify: '验签',
      signToken: '签发 Token',
      useGeneratedSecret: '使用已生成的 Secret'
    },
    algorithms: {
      hs256: 'HS256',
      hs384: 'HS384',
      hs512: 'HS512'
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
      secretEmpty: '请输入 Secret 以验签',
      signSecretEmpty: '请输入 Secret 以签名',
      signFailed: '签名失败',
      headerEmpty: '请输入 JWT Header',
      payloadEmpty: '请输入 JWT Payload',
      headerNotObject: 'JWT Header 必须是 JSON 对象',
      payloadNotObject: 'JWT Payload 必须是 JSON 对象',
      headerInvalidJson: 'JWT Header 不是有效的 JSON',
      payloadInvalidJson: 'JWT Payload 不是有效的 JSON'
    },
    empty: {
      secret: '点击「生成 Secret」开始',
      signedToken: '填写 Header、Payload 和 Secret 后签发'
    }
  }
