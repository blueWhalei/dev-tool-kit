export interface CertificateNameAttribute {
  shortName: string
  value: string
}

export interface CertificatePublicKeyInfo {
  type: string
  bits?: number
  curve?: string
}

export interface ParsedCertificateInfo {
  subject: CertificateNameAttribute[]
  issuer: CertificateNameAttribute[]
  subjectDisplay: string
  issuerDisplay: string
  validFrom: string
  validTo: string
  daysUntilExpiry: number
  isExpired: boolean
  isNotYetValid: boolean
  serialNumber: string
  subjectAltNames: string[]
  signatureAlgorithm: string
  publicKey: CertificatePublicKeyInfo
  fingerprint: string
  fingerprint256: string
}

export type CertificateParseSuccess = {
  success: true
  certificates: ParsedCertificateInfo[]
}

export type CertificateParseFailure = {
  success: false
  error: string
}

export type CertificateParseResult = CertificateParseSuccess | CertificateParseFailure

export interface CertificateFileReadResult {
  content: string
  fileName: string
}
