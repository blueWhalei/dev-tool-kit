export default {
    title: 'JWT Tools',
    description: 'Generate, decode, and verify JSON Web Tokens',
    tabs: {
      generate: 'Generate secret',
      sign: 'Sign token',
      decode: 'Decode'
    },
    labels: {
      secretLength: 'Secret length',
      recommended: 'Recommended: {algorithm}',
      generatedSecret: 'Generated secret',
      jwtToken: 'JWT token',
      header: 'Header',
      payload: 'Payload',
      hmacVerify: 'HMAC verify (optional)',
      issuedAt: 'Issued: {date}',
      expiresAt: 'Expires: {date}',
      remainingDays: '{days} days left',
      secretMatch: 'Secret matches',
      algorithm: 'Signing algorithm',
      signSecret: 'Signing secret',
      signedToken: 'Signed token'
    },
    placeholders: {
      jwtToken: 'Paste JWT token — decodes automatically...',
      verifySecret: 'Enter secret to verify signature...',
      signHeader: 'JWT header JSON',
      signPayload: 'JWT payload JSON',
      signSecret: 'Enter secret for signing...'
    },
    buttons: {
      generateSecret: 'Generate secret',
      copy: 'Copy',
      copied: 'Copied',
      fillSample: 'Fill sample',
      fillSignSample: 'Fill sample',
      decodeNow: 'Decode now',
      verify: 'Verify',
      signToken: 'Sign token',
      useGeneratedSecret: 'Use generated secret'
    },
    algorithms: {
      hs256: 'HS256',
      hs384: 'HS384',
      hs512: 'HS512'
    },
    secretLengths: {
      hs128: '128-bit (HS128)',
      hs256: '256-bit (HS256)',
      hs512: '512-bit (HS512)'
    },
    messages: {
      copied: 'Copied to clipboard',
      copiedPart: 'Copied',
      tokenExpired: 'Token expired',
      expiredAt: 'Expired at: {date}',
      signatureValid: 'Valid signature',
      signatureInvalid: 'Invalid signature'
    },
    errors: {
      decodeFailed: 'Decode failed',
      invalidBase64Url: 'Invalid Base64URL encoding',
      tokenEmpty: 'Enter a JWT token',
      secretEmpty: 'Enter a secret to verify',
      signSecretEmpty: 'Enter a secret to sign',
      signFailed: 'Signing failed',
      headerEmpty: 'Enter JWT header',
      payloadEmpty: 'Enter JWT payload',
      headerNotObject: 'JWT header must be a JSON object',
      payloadNotObject: 'JWT payload must be a JSON object',
      headerInvalidJson: 'JWT header is not valid JSON',
      payloadInvalidJson: 'JWT payload is not valid JSON'
    },
    empty: {
      secret: 'Click "Generate secret" to start',
      signedToken: 'Fill header, payload, and secret to sign'
    }
  }
