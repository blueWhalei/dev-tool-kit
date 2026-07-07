import { X509Certificate } from 'node:crypto'
import type {
  CertificateNameAttribute,
  CertificateParseResult,
  CertificatePublicKeyInfo,
  ParsedCertificateInfo
} from '@dev-tool-kit/shared'

const PEM_BLOCK_RE = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g

const SIGNATURE_ALGORITHM_OIDS: Array<{ pattern: Buffer; name: string }> = [
  {
    pattern: Buffer.from([0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0d]),
    name: 'sha512WithRSAEncryption'
  },
  {
    pattern: Buffer.from([0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0c]),
    name: 'sha384WithRSAEncryption'
  },
  {
    pattern: Buffer.from([0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b]),
    name: 'sha256WithRSAEncryption'
  },
  {
    pattern: Buffer.from([0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x05]),
    name: 'sha1WithRSAEncryption'
  },
  {
    pattern: Buffer.from([0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x04, 0x03, 0x01]),
    name: 'ecdsa-with-SHA224'
  },
  {
    pattern: Buffer.from([0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x04, 0x03, 0x02]),
    name: 'ecdsa-with-SHA256'
  },
  {
    pattern: Buffer.from([0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x04, 0x03, 0x03]),
    name: 'ecdsa-with-SHA384'
  },
  {
    pattern: Buffer.from([0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x04, 0x03, 0x04]),
    name: 'ecdsa-with-SHA512'
  },
  {
    pattern: Buffer.from([0x06, 0x03, 0x2b, 0x65, 0x70]),
    name: 'Ed25519'
  },
  {
    pattern: Buffer.from([0x06, 0x03, 0x2b, 0x65, 0x72]),
    name: 'Ed448'
  }
]

function extractPemBlocks(text: string): string[] {
  const matches = text.match(PEM_BLOCK_RE)
  return matches ?? []
}

function dnObjectToAttributes(
  dn: Record<string, string | string[] | undefined>
): CertificateNameAttribute[] {
  const order = ['CN', 'O', 'OU', 'L', 'ST', 'C', 'emailAddress']
  const seen = new Set<string>()
  const attrs: CertificateNameAttribute[] = []

  for (const key of order) {
    const value = dn[key]
    if (value === undefined) continue
    seen.add(key)
    if (Array.isArray(value)) {
      for (const item of value) {
        attrs.push({ shortName: key, value: item })
      }
    } else {
      attrs.push({ shortName: key, value })
    }
  }

  for (const [key, value] of Object.entries(dn)) {
    if (seen.has(key) || value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) {
        attrs.push({ shortName: key, value: item })
      }
    } else {
      attrs.push({ shortName: key, value })
    }
  }

  return attrs
}

function parseSubjectAltNames(raw?: string): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function detectSignatureAlgorithm(raw: Buffer): string {
  for (const { pattern, name } of SIGNATURE_ALGORITHM_OIDS) {
    if (raw.includes(pattern)) return name
  }
  return 'unknown'
}

function getPublicKeyInfo(cert: X509Certificate): CertificatePublicKeyInfo {
  const key = cert.publicKey
  const type = key.asymmetricKeyType ?? 'unknown'
  const info: CertificatePublicKeyInfo = { type }

  const details = key.asymmetricKeyDetails
  if (details?.modulusLength) {
    info.bits = details.modulusLength
  }

  const legacy = cert.toLegacyObject()
  if (legacy.nistCurve) {
    info.curve = String(legacy.nistCurve)
  } else if (legacy.asn1Curve) {
    info.curve = String(legacy.asn1Curve)
  }

  return info
}

function parseSingleCertificate(pem: string): ParsedCertificateInfo {
  const cert = new X509Certificate(pem)
  const legacy = cert.toLegacyObject()
  const validFromDate = new Date(cert.validFrom)
  const validToDate = new Date(cert.validTo)
  const now = Date.now()
  const msPerDay = 24 * 60 * 60 * 1000

  const daysUntilExpiry = Math.floor((validToDate.getTime() - now) / msPerDay)

  return {
    subject: dnObjectToAttributes(legacy.subject as Record<string, string | string[] | undefined>),
    issuer: dnObjectToAttributes(legacy.issuer as Record<string, string | string[] | undefined>),
    subjectDisplay: cert.subject.replace(/\n/g, ', '),
    issuerDisplay: cert.issuer.replace(/\n/g, ', '),
    validFrom: validFromDate.toISOString(),
    validTo: validToDate.toISOString(),
    daysUntilExpiry,
    isExpired: now > validToDate.getTime(),
    isNotYetValid: now < validFromDate.getTime(),
    serialNumber: cert.serialNumber,
    subjectAltNames: parseSubjectAltNames(cert.subjectAltName ?? legacy.subjectaltname),
    signatureAlgorithm: detectSignatureAlgorithm(cert.raw),
    publicKey: getPublicKeyInfo(cert),
    publicKeyPem: cert.publicKey.export({ type: 'spki', format: 'pem' }) as string,
    fingerprint: cert.fingerprint,
    fingerprint256: cert.fingerprint256
  }
}

export function parseCertificatePem(text: string): CertificateParseResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { success: false, error: '请输入 PEM 证书内容' }
  }

  const blocks = extractPemBlocks(trimmed)
  if (blocks.length === 0) {
    return { success: false, error: '未找到有效的 PEM 证书块' }
  }

  try {
    const certificates = blocks.map((block) => parseSingleCertificate(block))
    return { success: true, certificates }
  } catch (error) {
    const message = error instanceof Error ? error.message : '证书解析失败'
    return { success: false, error: message }
  }
}
