import type { CelenganCatalogItem } from '../types'

export const CELENGAN_CATALOG: CelenganCatalogItem[] = [
  {
    id: 'chillbank-classic',
    name: 'Chillbank Smart Classic',
    modelName: 'Chillbank Smart Classic (NTAG213)',
    tagline: 'Desain minimalis putih-emerald dengan chip NTAG213 waterproof bawaan.',
    price: 89000,
    chip: 'NXP NTAG213 (144 Bytes)',
    frequency: '13.56 MHz ISO 14443A',
    capacityText: 'Kapasitas s.d 400 koin / 200 lembar uang',
    description:
      'Celengan tabung premium dengan finishing matte lembut. Chip NFC NTAG213 tertanam presisi di bagian penutup atas, memudahkan tap smartphone Android atau pemindaian QR code untuk iOS/Laptop.',
    features: [
      'Chip NXP NTAG213 Original (144 bytes memory)',
      'Stiker QR Code tahan air cadangan di bagian dasar',
      'Material ABS Food-grade ramah lingkungan & kokoh',
      'Tutup kunci putar aman dengan indikator segel',
      'Kompatibel dengan semua smartphone NFC (Android & iOS via QR/NFC)',
    ],
    badge: 'Paling Populer',
    colorTheme: 'emerald',
  },
  {
    id: 'chillbank-wooden',
    name: 'Chillbank Wooden Family Edition',
    modelName: 'Chillbank Wooden Family Edition (NTAG213)',
    tagline: 'Elegan kayu pinus asli dengan panel akrilik transparan pemantau progres fisik.',
    price: 149000,
    chip: 'NXP NTAG213 High-Sensitivity (144 Bytes)',
    frequency: '13.56 MHz ISO 14443A',
    capacityText: 'Kapasitas besar s.d 800 koin / 400 lembar uang',
    description:
      'Dibuat khusus untuk ruang keluarga modern. Mengombinasikan kehangatan kayu pinus oven berkualitas tinggi dengan jendela akrilik bening untuk melihat tumpukan tabungan secara langsung, dilengkapi sensor NFC tersembunyi.',
    features: [
      'Kayu pinus solid berkualitas tinggi (oven dry)',
      'Hidden NFC Inlay di balik ukiran logo Chillbank',
      'Laser-engraved QR code cadangan beresolusi tinggi',
      'Kunci slot mekanik ekstra aman untuk perlindungan keluarga',
      'Kapasitas ekstra besar untuk target tabungan keluarga jangka panjang',
    ],
    badge: 'Edisi Premium',
    colorTheme: 'forest',
  },
  {
    id: 'chillbank-junior',
    name: 'Chillbank Junior Kids Edition',
    modelName: 'Chillbank Junior Kids Edition (NTAG213)',
    tagline: 'Karakter lucu ramah anak lengkap dengan Smart NFC Savings Card.',
    price: 75000,
    chip: 'NXP NTAG213 Smart Card & Tag',
    frequency: '13.56 MHz ISO 14443A',
    capacityText: 'Kapasitas s.d 300 koin / 150 lembar uang',
    description:
      'Dirancang khusus untuk melatih anak belajar menabung secara mandiri dan ceria. Dilengkapi satu celengan karakter warna pastel dan satu kartu tap tabungan berukuran kartu ATM dengan chip NTAG213.',
    features: [
      'Termasuk 1x Kartu Tabungan Pintar NFC NTAG213',
      'Desain ramah anak tanpa sudut tajam (anti-pecah)',
      'Sticker pack edukasi finansial untuk kustomisasi celengan',
      'Terhubung langsung dengan profil akun anak di aplikasi keluarga',
      'Fitur pencapaian target tabungan anak dengan reward visual',
    ],
    badge: 'Favorit Anak',
    colorTheme: 'mint',
  },
]
