# Nabungin Mini Bank — V2

Aplikasi web celengan NFC dengan pencatatan tabungan manual. Frontend React + Vite, autentikasi dan database Supabase.

## Fitur V2
- Beranda publik, daftar, login, logout
- Dashboard anggota
- Catatan celengan dan target tabungan
- Setoran/penarikan manual dengan saldo dihitung dari buku transaksi
- Halaman publik `/c/:serial` untuk hasil tap NFC / QR
- Form pemesanan celengan fisik untuk member dengan alamat dan nomor telepon
- Dashboard admin untuk memproses pesanan, mengubah status pengiriman, dan mencatat nomor resi
- Member dapat mengonfirmasi celengan sudah diterima
- Profil member dapat dilengkapi dan disimpan ke Supabase
- Halaman admin untuk mendaftarkan celengan dan menghubungkan kepemilikan
- Layout responsif untuk HP
- Tidak ada mode demo atau penyimpanan saldo di localStorage

## 1. Siapkan Supabase
1. Buat proyek di Supabase.
2. Buka SQL Editor.
3. Jalankan `supabase/migrations/001_initial_schema.sql` secara utuh.
4. Di Authentication → URL Configuration, atur Site URL ke domain Vercel dan tambahkan URL preview yang diperlukan ke Redirect URLs.
5. Untuk uji cepat, pengaturan konfirmasi email dapat disesuaikan di Authentication → Providers → Email. Jika konfirmasi diaktifkan, pengguna harus memverifikasi email sebelum login.

## 2. Atur environment
Salin `.env.example` menjadi `.env.local`, lalu isi:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (publishable/anon key dari Project Settings → API)

Jangan pernah memasukkan `service_role` atau secret key ke variabel `VITE_*`.

## 3. Jalankan lokal
```bash
npm install
npm run dev
```

## 4. Deploy Vercel
1. Upload/push seluruh folder ke GitHub.
2. Di Vercel, import repository.
3. Framework preset: Vite; Build command `npm run build`; Output directory `dist`.
4. Tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` pada Environment Variables.
5. Deploy ulang setelah environment variables diubah.

`vercel.json` menangani refresh langsung pada route seperti `/c/NBG-0001`.

## 5. Membuat admin
Daftar akun melalui aplikasi dahulu, lalu di Supabase SQL Editor jalankan:
```sql
update public.profiles
set role = 'admin'
where id = 'UUID_USER_DARI_AUTH_USERS';
```
UUID bisa dilihat pada Authentication → Users. Jangan memberikan akses admin melalui form publik.

## 6. Alur pemesanan celengan fisik
1. Member daftar/login lalu buka menu **Pesan celengan**.
2. Member mengisi nama penerima, nomor telepon, alamat, jumlah, dan catatan.
3. Admin buka **Dashboard admin**, ubah status pesanan, dan masukkan nomor resi saat paket dikirim.
4. Setelah status menjadi **Terkirim**, member menekan **Konfirmasi celengan diterima**.
5. Agar member dapat mulai mencatat tabungan, admin mendaftarkan celengan di dashboard admin dan mengisi UUID member sebagai pemilik. UUID bisa dilihat di Supabase → Authentication → Users. Gunakan nomor seri unik seperti `NBG-0001`.
6. Member melengkapi profil melalui menu **Profil**, lalu membuka **Celengan saya** untuk mulai mencatat setoran.

## 7. Tulis tag NFC
Tulis URL seperti `https://DOMAIN-VERCEL-KAMU/c/NBG-0001` ke NTAG213. Ganti serial dengan serial yang sama dengan yang didaftarkan admin di aplikasi.
NTAG213 hanya membuka URL; tag ini tidak membuktikan kepemilikan. Kepemilikan tetap diverifikasi oleh server dan sesi login.

## Catatan keamanan
- RLS membatasi data pengguna.
- Saldo dihitung dari transaksi, bukan kolom saldo yang bisa diedit.
- Transaksi dibuat melalui fungsi RPC database yang memvalidasi kepemilikan, status celengan, dan saldo penarikan.
- Admin perlu membuat celengan dan menetapkan kepemilikan. Alur klaim mandiri dengan kode rahasia belum termasuk V1.
- Aplikasi ini adalah pencatatan tabungan pribadi, bukan rekening bank dan tidak menerima/menyimpan dana pengguna.


## Perbaikan login: "Profil belum tersedia"

Jika registrasi berhasil tetapi login menampilkan pesan "Profil belum tersedia", biasanya akun sudah ada di `auth.users` tetapi barisnya belum ada di `public.profiles`. Jalankan file `supabase/migrations/002_backfill_profiles.sql` di **Supabase Dashboard → SQL Editor → New query → Run**. Script ini aman dijalankan ulang, mempertahankan profil/role yang sudah ada, dan membuat ulang trigger untuk pendaftaran berikutnya.

Setelah query selesai, hasil `auth_users_missing_profiles` seharusnya `0`. Pastikan aplikasi memakai URL dan anon/publishable key dari proyek Supabase yang sama dengan tempat SQL dijalankan. Jangan pernah menaruh `service_role` key di frontend.


## Perbaikan login v2: profil dibuat otomatis oleh aplikasi
Jalankan `supabase/migrations/003_ensure_profile_rpc.sql` di SQL Editor (sekali saja). File ini mem-backfill semua akun lama dan membuat fungsi `ensure_my_profile()`. Setelah itu, jika profil ternyata belum ada saat login, aplikasi membuatnya sendiri. Jika masih gagal, layar error kini menampilkan pesan asli dari Supabase pada baris "Detail".
