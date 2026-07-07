export default {
  title: 'Certificate Parser',
  description: 'Parse X.509 PEM certificates offline — subject, issuer, validity, and public key',
  input: 'PEM Certificate',
  inputPlaceholder: 'Paste PEM certificate (-----BEGIN CERTIFICATE-----)...',
  buttons: {
    loadFile: 'Load Certificate File',
    parse: 'Parse',
    useInJwt: 'Use in JWT verify'
  },
  labels: {
    subject: 'Subject',
    issuer: 'Issuer',
    validFrom: 'Valid From',
    validTo: 'Valid To',
    daysUntilExpiry: 'Days Until Expiry',
    serialNumber: 'Serial Number',
    subjectAltNames: 'Subject Alternative Names',
    signatureAlgorithm: 'Signature Algorithm',
    publicKeyType: 'Public Key Type',
    publicKeyBits: 'Key Size',
    publicKeyCurve: 'Curve',
    fingerprint: 'Fingerprint (SHA-1)',
    fingerprint256: 'Fingerprint (SHA-256)',
    certificate: 'Certificate',
    noSan: 'None',
    expired: 'Expired',
    notYetValid: 'Not Yet Valid',
    expiringSoon: 'Expiring Soon (within 30 days)',
    valid: 'Valid'
  },
  messages: {
    loadFileFailed: 'Failed to read certificate file',
    parseFailed: 'Failed to parse certificate',
    noInput: 'Enter or load a PEM certificate',
    copied: 'Copied',
    noPublicKey: 'Cannot export public key PEM'
  },
  errors: {
    pemEmpty: 'Enter PEM certificate content',
    pemNotFound: 'No valid PEM certificate block found'
  }
}
