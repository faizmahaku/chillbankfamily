/**
 * Helper Web NFC API untuk Tag NFC NTAG213 (ISO/IEC 14443A Type 2)
 * Digunakan pada celengan fisik Chillbank Family.
 */

declare global {
  interface Window {
    NDEFReader?: {
      new (): NDEFReaderInstance
    }
  }
}

export interface NDEFReaderInstance {
  scan: () => Promise<void>
  write: (message: NDEFMessageInit) => Promise<void>
  addEventListener: (type: string, listener: (event: any) => void) => void
  removeEventListener: (type: string, listener: (event: any) => void) => void
}

export interface NDEFMessageInit {
  records: Array<{
    recordType: 'text' | 'url' | 'mime'
    data: string
  }>
}

/**
 * Cek apakah browser mendukung Web NFC API (biasanya Google Chrome di Android).
 */
export function isWebNfcSupported(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window
}

/**
 * Ekstrak serial celengan dari data record NDEF (baik berupa URL maupun teks biasa).
 * Contoh format URL: "https://chillbank.vercel.app/c/CBF-001" -> "CBF-001"
 */
export function extractSerialFromNdef(data: string): string {
  const trimmed = data.trim()
  if (trimmed.includes('/c/')) {
    const parts = trimmed.split('/c/')
    return parts[parts.length - 1].replace(/[/?#].*$/, '').toUpperCase()
  }
  return trimmed.replace(/^cbf:/i, '').toUpperCase()
}

/**
 * Membaca tag NFC NTAG213 sekali tempel (one-shot read).
 */
export async function readSingleNfcTag(timeoutMs = 25000): Promise<{ serial: string; serialNumber?: string }> {
  if (!isWebNfcSupported() || !window.NDEFReader) {
    throw new Error('Web NFC tidak didukung pada browser/perangkat ini. Gunakan pemindai QR Code sebagai alternatif.')
  }

  const ndef = new window.NDEFReader()
  await ndef.scan()

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Waktu pemindaian NFC habis. Silakan dekatkan celengan kembali ke belakang HP.'))
    }, timeoutMs)

    const onReading = (event: any) => {
      clearTimeout(timer)
      try {
        const serialNumber = event.serialNumber || ''
        let extractedSerial = ''

        for (const record of event.message.records) {
          if (record.recordType === 'text') {
            const textDecoder = new TextDecoder(record.encoding || 'utf-8')
            const text = textDecoder.decode(record.data)
            extractedSerial = extractSerialFromNdef(text)
            break
          } else if (record.recordType === 'url') {
            const textDecoder = new TextDecoder()
            const url = textDecoder.decode(record.data)
            extractedSerial = extractSerialFromNdef(url)
            break
          }
        }

        if (!extractedSerial && serialNumber) {
          // Fallback menggunakan UID tag fisik NTAG213
          extractedSerial = `CBF-${serialNumber.replace(/:/g, '').slice(0, 8).toUpperCase()}`
        }

        if (!extractedSerial) {
          reject(new Error('Tag NFC terbaca namun tidak berisi nomor seri celengan Chillbank.'))
          return
        }

        resolve({ serial: extractedSerial, serialNumber })
      } catch (err) {
        reject(err)
      }
    }

    const onError = (err: any) => {
      clearTimeout(timer)
      reject(new Error(`Gagal membaca NFC: ${err?.message || 'Error tidak diketahui'}`))
    }

    ndef.addEventListener('reading', onReading)
    ndef.addEventListener('readingerror', onError)
  })
}

/**
 * Menulis URL celengan Chillbank ke chip NTAG213.
 * NTAG213 memiliki kapasitas 144 bytes user memory, sangat pas untuk URL NDEF pendek (±35-50 bytes).
 */
export async function writeNfcTag(serial: string, baseUrl?: string): Promise<boolean> {
  if (!isWebNfcSupported() || !window.NDEFReader) {
    throw new Error('Web NFC tidak didukung pada browser/perangkat ini. Gunakan Chrome di smartphone Android.')
  }

  const host = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://chillbank.vercel.app')
  const targetUrl = `${host}/c/${encodeURIComponent(serial.toUpperCase())}`

  const ndef = new window.NDEFReader()
  await ndef.write({
    records: [
      {
        recordType: 'url',
        data: targetUrl,
      },
    ],
  })

  return true
}

export const NTAG213_SPEC = {
  chip: 'NXP NTAG213',
  standard: 'ISO/IEC 14443 Type A, NFC Forum Type 2 Tag',
  operatingFrequency: '13.56 MHz',
  totalMemory: '180 Bytes',
  userMemory: '144 Bytes (36 Halaman x 4 Bytes)',
  writeEndurance: '100.000 kali penulisan',
  dataRetention: '10 Tahun',
  optimalDistance: '1 - 3 cm dari antena smartphone',
}
