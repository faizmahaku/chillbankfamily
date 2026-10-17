-- ==============================================================================
-- Chillbank Family - Master Database Schema & RLS Setup
-- ==============================================================================
-- Idempotent script: aman dijalankan berulang kali di Supabase SQL Editor.
-- ==============================================================================

begin;

-- 1. EXTENSIONS
create extension if not exists pgcrypto;

-- 2. TABEL: PROFILES (PROFIL ANGGOTA KELUARGA)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  bio text not null default '',
  role text not null default 'parent' check (role in ('parent', 'child', 'admin', 'member')),
  avatar_color text not null default 'emerald',
  created_at timestamptz not null default now()
);

-- Pastikan kolom baru selalu ada jika tabel profiles sudah pernah dibuat sebelumnya
alter table public.profiles add column if not exists phone text not null default '';
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists role text not null default 'parent';
alter table public.profiles add column if not exists avatar_color text not null default 'emerald';

-- 3. TABEL: PIGGY_BANKS (CELENGAN KELUARGA)
create table if not exists public.piggy_banks (
  id uuid primary key default gen_random_uuid(),
  serial text not null unique check (serial ~ '^[A-Za-z0-9-]{3,40}$'),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null default 'Celengan Chillbank',
  category text not null default 'smart-classic',
  color text not null default 'emerald',
  status text not null default 'active' check (status in ('active', 'inactive', 'lost')),
  nfc_uid text default null,
  created_at timestamptz not null default now()
);

alter table public.piggy_banks add column if not exists category text not null default 'smart-classic';
alter table public.piggy_banks add column if not exists color text not null default 'emerald';
alter table public.piggy_banks add column if not exists nfc_uid text default null;

-- 4. TABEL: SAVINGS_ENTRIES (TRANSAKSI TABUNGAN / MUTASI)
create table if not exists public.savings_entries (
  id uuid primary key default gen_random_uuid(),
  piggy_bank_id uuid not null references public.piggy_banks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_type text not null check (entry_type in ('deposit', 'withdrawal')),
  amount bigint not null check (amount > 0 and amount <= 100000000000),
  note text not null default '',
  created_at timestamptz not null default now()
);

-- 5. TABEL: SAVINGS_GOALS (TARGET TABUNGAN IMPIAN KELUARGA)
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  piggy_bank_id uuid references public.piggy_banks(id) on delete set null,
  name text not null check (char_length(name) between 1 and 100),
  target_amount bigint not null check (target_amount > 0 and target_amount <= 100000000000),
  target_date date,
  created_at timestamptz not null default now()
);

alter table public.savings_goals add column if not exists piggy_bank_id uuid references public.piggy_banks(id) on delete set null;

-- 6. TABEL: PIGGY_BANK_ORDERS (PESANAN CELENGAN FISIK CHILLBANK)
create table if not exists public.piggy_bank_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_name text not null check (char_length(recipient_name) between 1 and 120),
  phone text not null check (char_length(phone) between 6 and 30),
  address text not null check (char_length(address) between 8 and 1000),
  product_model text not null default 'Chillbank Smart Classic (NTAG213)',
  quantity integer not null default 1 check (quantity between 1 and 20),
  note text not null default '',
  status text not null default 'pending' check (status in ('pending','confirmed','processing','shipped','delivered','received','cancelled')),
  tracking_number text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.piggy_bank_orders add column if not exists product_model text not null default 'Chillbank Smart Classic (NTAG213)';

-- 7. INDEXES (PENGOPTIMALAN KINERJA QUERY)
create index if not exists idx_banks_owner on public.piggy_banks(owner_id);
create index if not exists idx_banks_serial on public.piggy_banks(serial);
create index if not exists idx_entries_bank_date on public.savings_entries(piggy_bank_id, created_at desc);
create index if not exists idx_entries_user_date on public.savings_entries(user_id, created_at desc);
create index if not exists idx_goals_user on public.savings_goals(user_id);
create index if not exists idx_orders_user_created on public.piggy_bank_orders(user_id, created_at desc);

-- 8. HELPER SECURITY DEFINER: CEK APAKAH USER ADALAH ADMIN
-- Menggunakan security definer agar mengecek admin TIDAK memicu rekursi RLS pada tabel profiles!
drop function if exists public.is_admin() cascade;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- 9. TRIGGER OTOMATIS: BUAT PROFIL SAAT USER BARU MENDAFTAR
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'parent');
  if v_role not in ('parent', 'child', 'admin', 'member') then
    v_role := 'parent';
  end if;

  insert into public.profiles (id, full_name, role, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Anggota Chillbank'),
    v_role,
    coalesce(new.raw_user_meta_data ->> 'avatar_color', 'emerald')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 10. TRIGGER: KEAMANAN ROLE PROFIL (NON-ADMIN TIDAK BISA SELF-PROMOTE JADI ADMIN)
drop trigger if exists protect_profile_role_trigger on public.profiles;
drop function if exists public.protect_profile_role() cascade;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Hanya blokir jika dipanggil dari sesi autentikasi client (auth.uid() IS NOT NULL)
  -- dan pemanggil BUKAN admin. Query langsung dari SQL Editor (auth.uid() IS NULL) diizinkan.
  if auth.uid() is not null
     and new.role is distinct from old.role
     and new.role = 'admin'
     and not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'admin'
     ) then
    raise exception 'Hanya administrator yang dapat mengubah role menjadi admin';
  end if;
  return new;
end;
$$;

create trigger protect_profile_role_trigger
before update on public.profiles
for each row execute function public.protect_profile_role();

-- 11. RPC: JARING PENGAMAN PROFIL (MEMASTIKAN PROFIL TERSEDIA SAAT LOGIN)
drop function if exists public.ensure_my_profile() cascade;

create or replace function public.ensure_my_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Login diperlukan';
  end if;
  insert into public.profiles (id, full_name, phone, bio, role, avatar_color)
  select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', 'Anggota Chillbank'), '', '', 'parent', 'emerald'
  from auth.users u
  where u.id = v_uid
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;

-- 12. RPC: TAMBAH TRANSAKSI SETOR / TARIK TABUNGAN DENGAN LOCK CONCURRENCY
drop function if exists public.add_savings_entry(uuid, text, bigint, text) cascade;

create or replace function public.add_savings_entry(
  p_piggy_bank_id uuid,
  p_entry_type text,
  p_amount bigint,
  p_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_balance numeric;
  v_entry_id uuid;
begin
  if v_user is null then
    raise exception 'Harap login terlebih dahulu';
  end if;
  if p_entry_type not in ('deposit', 'withdrawal') then
    raise exception 'Tipe transaksi tidak valid';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000000 then
    raise exception 'Nominal transaksi tidak valid';
  end if;

  -- Kunci baris celengan agar penarikan tidak melebihi saldo aktual
  perform 1 from public.piggy_banks
    where id = p_piggy_bank_id and (owner_id = v_user or public.is_admin()) and status = 'active'
    for update;
  if not found then
    raise exception 'Celengan tidak ditemukan, nonaktif, atau bukan milik Anda';
  end if;

  select coalesce(sum(case when entry_type = 'deposit' then amount else -amount end), 0)
    into v_balance
  from public.savings_entries
  where piggy_bank_id = p_piggy_bank_id;

  if p_entry_type = 'withdrawal' and p_amount > v_balance then
    raise exception 'Penarikan melebihi saldo celengan saat ini';
  end if;

  insert into public.savings_entries(piggy_bank_id, user_id, entry_type, amount, note)
  values (p_piggy_bank_id, v_user, p_entry_type, p_amount, left(coalesce(p_note, ''), 300))
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke all on function public.add_savings_entry(uuid, text, bigint, text) from public, anon;
grant execute on function public.add_savings_entry(uuid, text, bigint, text) to authenticated;

-- 13. RPC: ADMIN MEMBUAT / MENDAFTARKAN CELENGAN & PROGRAMMING NFC NTAG213
drop function if exists public.admin_create_bank(text, text, uuid) cascade;
drop function if exists public.admin_create_bank(text, text, uuid, text, text, text) cascade;

create or replace function public.admin_create_bank(
  p_serial text,
  p_name text default 'Celengan Chillbank',
  p_owner_id uuid default null,
  p_category text default 'smart-classic',
  p_color text default 'emerald',
  p_nfc_uid text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Hanya administrator yang berhak mendaftarkan celengan';
  end if;

  insert into public.piggy_banks(serial, name, owner_id, category, color, nfc_uid)
  values (
    upper(trim(p_serial)),
    left(trim(coalesce(p_name, 'Celengan Chillbank')), 100),
    p_owner_id,
    coalesce(p_category, 'smart-classic'),
    coalesce(p_color, 'emerald'),
    p_nfc_uid
  )
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.admin_create_bank(text, text, uuid, text, text, text) to authenticated;

-- 14. RPC: LOOKUP PUBLIK UNTUK SCAN NFC / QR CELENGAN
drop function if exists public.public_bank_lookup(text) cascade;

create or replace function public.public_bank_lookup(p_serial text)
returns table(
  serial text,
  name text,
  status text,
  category text,
  color text
)
language sql
security definer
set search_path = ''
as $$
  select b.serial, b.name, b.status, b.category, b.color
  from public.piggy_banks b
  where upper(b.serial) = upper(trim(p_serial))
    and b.status = 'active'
  limit 1;
$$;

grant execute on function public.public_bank_lookup(text) to anon, authenticated;

-- 15. RPC: MEMBER MEMBUAT CELENGAN DIGITAL PRIBADI / KELUARGA
drop function if exists public.member_create_digital_bank(text) cascade;

create or replace function public.member_create_digital_bank(
  p_name text default 'Tabungan Utama'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_serial text;
  v_clean_name text;
begin
  if v_user is null then
    raise exception 'Harap login terlebih dahulu';
  end if;

  v_clean_name := coalesce(nullif(trim(p_name), ''), 'Tabungan Utama');
  v_serial := 'CBF-DGT-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  insert into public.piggy_banks (
    serial,
    name,
    owner_id,
    category,
    color,
    status
  ) values (
    v_serial,
    v_clean_name,
    v_user,
    'smart-classic',
    'emerald',
    'active'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.member_create_digital_bank(text) from public, anon;
grant execute on function public.member_create_digital_bank(text) to authenticated;

-- 16. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.piggy_banks enable row level security;
alter table public.savings_entries enable row level security;
alter table public.savings_goals enable row level security;
alter table public.piggy_bank_orders enable row level security;

-- Policies Profiles:
-- Bebas dari rekursi karena menggunakan public.is_admin() ber-security definer
drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles
for select to authenticated using (
  id = (select auth.uid()) or public.is_admin()
);

drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "Admin update any profile" on public.profiles;
create policy "Admin update any profile" on public.profiles
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Policies Piggy Banks
drop policy if exists "Read own banks" on public.piggy_banks;
create policy "Read own banks" on public.piggy_banks
for select to authenticated using (
  owner_id = (select auth.uid()) or public.is_admin()
);

drop policy if exists "Members link unowned bank" on public.piggy_banks;
create policy "Members link unowned bank" on public.piggy_banks
for update to authenticated
using (owner_id is null or owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "Admin manages banks" on public.piggy_banks;
create policy "Admin manages banks" on public.piggy_banks
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Policies Savings Entries
drop policy if exists "Read own entries" on public.savings_entries;
create policy "Read own entries" on public.savings_entries
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.piggy_banks b
    where b.id = piggy_bank_id and b.owner_id = (select auth.uid())
  )
  or public.is_admin()
);

drop policy if exists "Insert own entries" on public.savings_entries;
create policy "Insert own entries" on public.savings_entries
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.piggy_banks b
    where b.id = piggy_bank_id and (b.owner_id = (select auth.uid()) or public.is_admin())
  )
);

drop policy if exists "Admin manage all entries" on public.savings_entries;
create policy "Admin manage all entries" on public.savings_entries
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Policies Savings Goals
drop policy if exists "Manage own goals" on public.savings_goals;
create policy "Manage own goals" on public.savings_goals
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Policies Piggy Bank Orders
drop policy if exists "Members create own orders" on public.piggy_bank_orders;
create policy "Members create own orders" on public.piggy_bank_orders
for insert to authenticated
with check (user_id = (select auth.uid()) and status = 'pending');

drop policy if exists "Members read own orders" on public.piggy_bank_orders;
create policy "Members read own orders" on public.piggy_bank_orders
for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Admins manage orders" on public.piggy_bank_orders;
create policy "Admins manage orders" on public.piggy_bank_orders
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members confirm received orders" on public.piggy_bank_orders;
create policy "Members confirm received orders" on public.piggy_bank_orders
for update to authenticated
using (user_id = (select auth.uid()) and status = 'delivered')
with check (user_id = (select auth.uid()) and status = 'received');

-- 16. BACKFILL: PASTIKAN SEMUA USER DI AUTH.USERS MEMILIKI BARIS PROFIL
insert into public.profiles (id, full_name, phone, bio, role, avatar_color)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', 'Anggota Chillbank'),
  '',
  '',
  'parent',
  'emerald'
from auth.users as u
left join public.profiles as p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

commit;

-- Verifikasi akhir
select count(*) as auth_users_missing_profiles
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
