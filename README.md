# Chillbank Family — Smart Celengan NFC & QR Keluarga

> **Platform Celengan Fisik Pintar Keluarga dengan Integrasi Web NFC NTAG213, QR Code Fallback, Autentikasi Supabase, dan Row Level Security (RLS).**

---

## 🌟 Tentang Chillbank Family

**Chillbank Family** adalah platform modern berbasis web yang menghubungkan celengan fisik di rumah dengan sistem pencatatan tabungan digital keluarga. Dilengkapi dengan chip **NFC NXP NTAG213 (144 Bytes)** dan **QR Code tahan air** sebagai cadangan, platform ini dirancang khusus untuk membangun kebiasaan finansial positif bagi anak-anak dan orang tua.

Setiap anggota keluarga dapat menempelkan smartphone langsung ke celengan untuk membuka saldo secara instan, mencatat setoran tabungan harian, dan memantau progres pencapaian target impian bersama.

---

## 🚀 Fitur Utama

1. **Desain Modern Profesional Hijau-Putih**:
   - Palet warna Fintech Emerald Green (`#059669`) dan Fresh Mint (`#ECFDF5`).
   - Tampilan mobile-first yang sangat responsif dengan Mobile Bottom Navigation Bar & Desktop Sidebar.
   - Micro-interactions halus, status chip interaktif, dan visualisasi celengan 3D.

2. **Autentikasi & Profil Anggota Keluarga (Supabase Auth & RLS)**:
   - Login & Registrasi dengan validasi input, auto-trimming, dan pesan error berbahasa Indonesia yang bersahabat.
   - Peran Anggota Keluarga:
     - **Orang Tua (Parent)**: Mengelola tabungan bersama, memantau celengan anak, menetapkan target impian.
     - **Anak (Child)**: Memantau celengan miliknya, mencatat tabungan harian, dan melihat target hadiah/impian.
     - **Administrator**: Akses khusus untuk registrasi produk celengan, manajemen pesanan, dan penulisan chip NFC.
   - Trigger otomatis pembuatan profil saat registrasi dan perlindungan role dengan trigger PostgreSQL.

3. **Manajemen Tabungan & Mutasi Real-time**:
   - Akumulasi total saldo keluarga dan saldo terperinci per celengan.
   - Pencatatan Setoran (*Deposit*) dan Penarikan (*Withdrawal*) dengan proteksi saldo tidak boleh minus.
   - Riwayat mutasi lengkap dengan filter kategori (Semua / Setor / Tarik) dan pencarian catatan.

4. **Target Tabungan Impian (Savings Goals)**:
   - Pembuatan target tabungan (contoh: *Liburan Akhir Tahun*, *Sepeda Baru Adik*, *Dana Pendidikan*).
   - Visual progress bar dinamis (0–100%) dan perhitungan sisa waktu menuju target.

5. **Integrasi Chip NFC NTAG213**:
   - Mendukung **Web NFC API** bawaan browser (Google Chrome di Android).
   - **Tap to Open**: Menempelkan smartphone ke chip NTAG213 otomatis membuka halaman `/c/:serial`.
   - **Write to Tag**: Fitur untuk memprogram URL celengan ke tag NTAG213 fisik langsung dari aplikasi.
   - Spesifikasi Chip: NXP NTAG213, 144 Bytes User Memory, 13.56 MHz ISO/IEC 14443A Type 2.

6. **QR Code Fallback System**:
   - **Scanner Kamera QR**: Pemindaian kamera langsung untuk perangkat iOS / Laptop yang tidak memiliki Web NFC API.
   - **QR Code Generator & Cetak Stiker**: Pembuatan stiker QR Code vektor beresolusi tinggi untuk setiap celengan yang dapat langsung diunduh atau dicetak.

7. **Katalog & Pemesanan Celengan Fisik**:
   - Katalog produk celengan fisik (Chillbank Smart Classic, Chillbank Wooden Family Edition, Chillbank Junior Kids Edition).
   - Formulir pemesanan online lengkap dengan alamat dan pelacakan status pesanan (Menunggu, Dikonfirmasi, Diproses, Dikirim, Diterima).

8. **Dashboard Administrator (`/admin`)**:
   - Registrasi celengan fisik baru dan pembuatan nomor seri unik.
   - Pemrograman batch chip NFC NTAG213.
   - Manajemen pesanan anggota dan input nomor resi kurir pengiriman (JNE, SiCepat, J&T).

---

## 🛠️ Arsitektur Teknologi

- **Frontend**: React 18, TypeScript, Vite, React Router DOM v6
- **Styling**: Modern Vanilla CSS Design System (Hijau-Putih, responsif, zero-bloat)
- **Icons**: Lucide React
- **NFC Engine**: W3C Web NFC API (`NDEFReader`)
- **QR Engine**: QR Code Vector Generator & HTML5 Video Camera Stream
- **Backend & Database**: Supabase (PostgreSQL, GoTrue Auth, Row Level Security, RPC Functions)
- **Deployment**: Vercel Ready (`vercel.json` SPA rewrite included)

---

## 📁 Struktur Direktori

```
chillbank-family/
├── public/                 # Aset statis
├── src/
│   ├── lib/
│   │   ├── catalog.ts      # Katalog produk celengan fisik Chillbank
│   │   ├── nfc.ts          # Integrasi Web NFC API & NTAG213 specs
│   │   ├── qr.ts           # QR code generator (PNG & SVG)
│   │   └── supabase.ts     # Inisialisasi klien Supabase
│   ├── App.tsx             # Seluruh komponen aplikasi & routing
│   ├── main.tsx            # Entry point React
│   ├── styles.css          # Design system modern profesional hijau-putih
│   ├── types.ts            # Definisi TypeScript data model
│   └── vite-env.d.ts       # Type declarations
├── supabase/
│   ├── schema.sql          # Master SQL schema, RLS, triggers & RPC functions
│   └── reset.sql           # Skrip reset database darurat
├── .env.example            # Template variabel lingkungan Supabase
├── index.html              # HTML shell dengan font Plus Jakarta Sans
├── package.json            # Dependensi dan skrip proyek
├── tsconfig.json           # Konfigurasi TypeScript
├── vercel.json             # Konfigurasi rewrite SPA Vercel
└── vite.config.ts          # Konfigurasi Vite
```

---

## ⚡ Panduan Menjalankan Proyek Secara Lokal

### 1. Prasyarat
- Node.js versi 18 atau lebih tinggi
- Akun [Supabase](https://supabase.com) (Gratis)

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Database Supabase
1. Masuk ke **Supabase Dashboard** -> Buat project baru (atau gunakan project yang sudah ada).
2. Buka menu **SQL Editor** -> **New Query**.
3. Salin seluruh isi file [`supabase/schema.sql`](file:///e:/Web/nabungin-v2-login-fix2/supabase/schema.sql) dan klik **Run**.
4. Semua tabel (`profiles`, `piggy_banks`, `savings_entries`, `savings_goals`, `piggy_bank_orders`), fungsi RPC, dan aturan RLS akan otomatis terkonfigurasi.

### 4. Konfigurasi Environment Variables
Buat file `.env.local` atau `.env` dari template `.env.example`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 5. Jalankan Server Dev
```bash
npm run dev
```
Buka browser pada alamat `http://localhost:5173`.

---

## 🚢 Panduan Deploy ke Vercel

Aplikasi ini sudah 100% siap untuk dideploy ke [Vercel](https://vercel.com):

### Metode 1: Lewat Git (GitHub / GitLab)
1. Push repositori ini ke GitHub Anda:
   ```bash
   git add .
   git commit -m "feat: complete chillbank family release"
   git push origin main
   ```
2. Buka **Vercel Dashboard** -> Klik **Add New Project** -> Pilih repositori GitHub Anda.
3. Di bagian **Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL`: URL project Supabase Anda
   - `VITE_SUPABASE_ANON_KEY`: Anon Key Supabase Anda
4. Klik **Deploy**. Selesai dalam < 1 menit! File `vercel.json` akan otomatis mengarahkan semua rute SPA ke `index.html`.

### Metode 2: Lewat Vercel CLI
```bash
npx vercel
```

---

## 🏷️ Panduan Memprogram Chip NFC NTAG213

Untuk menghubungkan celengan fisik baru dengan sistem:
1. Pastikan Anda membuka aplikasi di smartphone Android menggunakan Google Chrome dengan HTTPS / Vercel URL.
2. Masuk sebagai **Administrator** atau pemilik celengan.
3. Buka halaman Celengan -> Klik **Tulis ke Tag NTAG213**.
4. Dekatkan smartphone ke chip NTAG213 pada celengan fisik (biasanya 1–3 cm).
5. Chip NTAG213 akan dituliskan record URL: `https://your-domain.vercel.app/c/{SERIAL}`.
6. Sekarang, siapa pun yang menempelkan smartphone ke celengan tersebut akan langsung diarahkan ke halaman celengan digital!

---

## 📄 Lisensi
Hak Cipta © 2026 Chillbank Family. Dibuat dengan standar performa dan keamanan tinggi.
