export default {
    title: 'JWT Tools',
    description: 'Generate, decode, and verify JSON Web Tokens',
    tabs: {
      generate: 'Generate',
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
      secretMatch: 'Secret matches'
    },
    placeholders: {
      jwtToken: 'Paste JWT token — decodes automatically...',
      verifySecret: 'Enter secret to verify signature...'
    },
    buttons: {
      generateSecret: 'Generate secret',
      copy: 'Copy',
      copied: 'Copied',
      fillSample: 'Fill sample',
      decodeNow: 'Decode now',
      verify: 'Verify'
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
      secretEmpty: 'Enter a secret to verify'
    },
    empty: {
      secret: 'Click "Generate secret" to start'
    }
  }
