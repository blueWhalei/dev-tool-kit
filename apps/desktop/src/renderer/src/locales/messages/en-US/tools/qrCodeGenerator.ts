export default {
  title: 'QR Code Generator',
  description: 'Generate QR codes from text or URLs — fully offline',
  labels: {
    text: 'Content',
    size: 'Size (px)',
    errorLevel: 'Error correction',
    margin: 'Margin'
  },
  placeholders: {
    text: 'Enter text or URL...'
  },
  errorLevels: {
    L: 'L (Low ~7%)',
    M: 'M (Medium ~15%)',
    Q: 'Q (Quartile ~25%)',
    H: 'H (High ~30%)'
  },
  buttons: {
    download: 'Download PNG',
    copyImage: 'Copy image'
  },
  messages: {
    copiedImage: 'Image copied',
    copyImageFailed: 'Copy image failed — try download',
    emptyText: 'Enter content to generate QR code'
  }
}
