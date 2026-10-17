import QRCode from 'qrcode'

/**
 * Generate QR Code as Data URL (PNG)
 */
export async function generateQrDataUrl(text: string, options?: QRCode.QRCodeToDataURLOptions): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 320,
      margin: 2,
      color: {
        dark: '#064e3b', // Deep forest/emerald green
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
      ...options,
    })
  } catch (err) {
    console.error('Gagal generate QR Code:', err)
    return ''
  }
}

/**
 * Generate QR Code as SVG String for high resolution rendering & print
 */
export async function generateQrSvg(text: string): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      margin: 1,
      color: {
        dark: '#064e3b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
  } catch (err) {
    console.error('Gagal generate SVG QR Code:', err)
    return ''
  }
}
