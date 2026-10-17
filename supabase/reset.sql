-- ==============================================================================
-- Nabungin: Reset & Drop Semua Tabel, Trigger, dan Fungsi
-- ==============================================================================
-- PERINGATAN: Menjalankan file ini akan MENGHAPUS SEMUA DATA dan TABEL aplikasi Nabungin.
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- ==============================================================================

begin;

-- 1. Hapus Triggers terlebih dahulu
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists protect_profile_role_trigger on public.profiles;

-- 2. Hapus Fungsi-fungsi RPC & Helper
drop function if exists public.handle_new_user() cascade;
drop function if exists public.protect_profile_role() cascade;
drop function if exists public.ensure_my_profile() cascade;
drop function if exists public.add_savings_entry(uuid, text, bigint, text) cascade;
drop function if exists public.admin_create_bank(text, text, uuid) cascade;
drop function if exists public.public_bank_lookup(text) cascade;

-- 3. Hapus Semua Tabel Aplikasi (beserta foreign keys dan policies-nya)
drop table if exists public.savings_entries cascade;
drop table if exists public.savings_goals cascade;
drop table if exists public.piggy_bank_orders cascade;
drop table if exists public.piggy_banks cascade;
drop table if exists public.profiles cascade;

commit;

-- Verifikasi: memastikan tidak ada lagi tabel nabungin yang tersisa di skema public
select table_name 
from information_schema.tables 
where table_schema = 'public' 
  and table_name in ('profiles', 'piggy_banks', 'savings_entries', 'savings_goals', 'piggy_bank_orders');
