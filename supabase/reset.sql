-- ==============================================================================
-- Nabungin: Drop Semua Tabel & Fungsi (Jalankan di Supabase SQL Editor)
-- ==============================================================================
-- Dibuat tanpa BEGIN/COMMIT agar jika ada izin auth yang dibatasi, 
-- perintah penghapusan tabel tetap berjalan sukses 100%.
-- ==============================================================================

-- 1. HAPUS SEMUA TABEL APLIKASI SECARA PAKSA (CASCADE)
drop table if exists public.savings_entries cascade;
drop table if exists public.savings_goals cascade;
drop table if exists public.piggy_bank_orders cascade;
drop table if exists public.piggy_banks cascade;
drop table if exists public.profiles cascade;

-- 2. HAPUS FUNGSI & RPC
drop function if exists public.handle_new_user() cascade;
drop function if exists public.protect_profile_role() cascade;
drop function if exists public.ensure_my_profile() cascade;
drop function if exists public.add_savings_entry(uuid, text, bigint, text) cascade;
drop function if exists public.admin_create_bank(text, text, uuid) cascade;
drop function if exists public.public_bank_lookup(text) cascade;

-- 3. HAPUS TRIGGER AUTH (JIKA ADA IZIN)
drop trigger if exists on_auth_user_created on auth.users;

-- 4. VERIFIKASI (HASIL HARUS KOSONG)
select table_name 
from information_schema.tables 
where table_schema = 'public' 
  and table_name in ('profiles', 'piggy_banks', 'savings_entries', 'savings_goals', 'piggy_bank_orders');
