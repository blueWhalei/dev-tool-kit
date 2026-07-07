export default {
  title: 'Key Pair Generator',
  description: 'Generate RSA / EC key pairs locally and export PEM public and private keys',
  labels: {
    algorithm: 'Algorithm',
    keyType: 'Key type',
    publicKey: 'Public key (PEM)',
    privateKey: 'Private key (PEM)'
  },
  algorithms: {
    'rsa-2048': 'RSA 2048',
    'rsa-4096': 'RSA 4096',
    'ec-p256': 'EC P-256',
    'ec-p384': 'EC P-384'
  },
  buttons: {
    generate: 'Generate key pair',
    regenerate: 'Regenerate',
    useInJwt: 'Use in JWT verify'
  },
  messages: {
    copied: 'Copied to clipboard',
    generateFailed: 'Key generation failed',
    noKeys: 'Generate a key pair first'
  },
  errors: {
    invalid_algorithm: 'Unsupported algorithm',
    generate_failed: 'Key generation failed'
  },
  empty: 'Select an algorithm and click Generate'
}
