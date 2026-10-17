-- Nabungin V1 schema
create extension if not exists pgcrypto;

alter table if exists public.profiles add column if not exists phone text not null default '';
alter table if exists public.profiles add column if not exists bio text not null default '';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  bio text not null default '',
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.piggy_banks (
  id uuid primary key default gen_random_uuid(),
  serial text not null unique check (serial ~ '^[A-Za-z0-9-]{3,40}$'),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null default 'Celengan Saya',
  status text not null default 'active' check (status in ('active', 'inactive', 'lost')),
  created_at timestamptz not null default now()
);

create table if not exists public.savings_entries (
  id uuid primary key default gen_random_uuid(),
  piggy_bank_id uuid not null references public.piggy_banks(id),
  user_id uuid not null references public.profiles(id),
  entry_type text not null check (entry_type in ('deposit', 'withdrawal')),
  amount bigint not null check (amount > 0 and amount <= 100000000000),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  target_amount bigint not null check (target_amount > 0 and target_amount <= 100000000000),
  target_date date,
  created_at timestamptz not null default now()
);

create index if not exists idx_banks_owner on public.piggy_banks(owner_id);
create index if not exists idx_entries_bank_date on public.savings_entries(piggy_bank_id, created_at desc);
create index if not exists idx_entries_user_date on public.savings_entries(user_id, created_at desc);
create index if not exists idx_goals_user on public.savings_goals(user_id);

-- Create profile for every new Auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for Auth users created before this trigger existed.
insert into public.profiles (id, full_name, phone, bio, role)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  '',
  '',
  'member'
from auth.users as u
left join public.profiles as p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Prevent members from promoting themselves.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and not exists (
       select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.role = 'admin'
     ) then
    raise exception 'Role changes are not permitted';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
before update on public.profiles
for each row execute function public.protect_profile_role();

alter table public.profiles enable row level security;
alter table public.piggy_banks enable row level security;
alter table public.savings_entries enable row level security;
alter table public.savings_goals enable row level security;

drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles
for select to authenticated using (id = (select auth.uid()));

drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "Read own banks" on public.piggy_banks;
create policy "Read own banks" on public.piggy_banks
for select to authenticated using (owner_id = (select auth.uid()));

-- Public NFC lookup is handled by a restricted RPC below.
-- Do NOT grant anon direct SELECT on piggy_banks, because that would expose owner_id.
drop policy if exists "Read bank by serial for NFC page" on public.piggy_banks;

drop policy if exists "Admin manages banks" on public.piggy_banks;
create policy "Admin manages banks" on public.piggy_banks
for all to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

drop policy if exists "Read own entries" on public.savings_entries;
create policy "Read own entries" on public.savings_entries
for select to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.piggy_banks b
    where b.id = piggy_bank_id and b.owner_id = (select auth.uid())
  )
);

-- No direct INSERT/UPDATE/DELETE policies on savings_entries.
-- Writes must go through the RPC below.

drop policy if exists "Manage own goals" on public.savings_goals;
create policy "Manage own goals" on public.savings_goals
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Public RPC for adding an entry. Validate ownership and prevent negative balance.
create or replace function public.add_savings_entry(
  p_piggy_bank_id uuid,
  p_entry_type text,
  p_amount bigint,
  p_note text default ''
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_balance numeric;
  v_entry_id uuid;
begin
  if v_user is null then
    raise exception 'Login required';
  end if;
  if p_entry_type not in ('deposit', 'withdrawal') then
    raise exception 'Invalid entry type';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000000 then
    raise exception 'Invalid amount';
  end if;

  -- Serialize writes per bank to avoid simultaneous withdrawals exceeding balance.
  perform 1 from public.piggy_banks
    where id = p_piggy_bank_id and owner_id = v_user and status = 'active'
    for update;
  if not found then
    raise exception 'Bank not found or not owned by user';
  end if;

  select coalesce(sum(case when entry_type = 'deposit' then amount else -amount end), 0)
    into v_balance
  from public.savings_entries
  where piggy_bank_id = p_piggy_bank_id;

  if p_entry_type = 'withdrawal' and p_amount > v_balance then
    raise exception 'Withdrawal exceeds recorded balance';
  end if;

  insert into public.savings_entries(piggy_bank_id, user_id, entry_type, amount, note)
  values (p_piggy_bank_id, v_user, p_entry_type, p_amount, left(coalesce(p_note, ''), 300))
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

grant execute on function public.add_savings_entry(uuid, text, bigint, text) to authenticated;

-- Admin-only product registration. Does not assign ownership unless owner ID is supplied.
create or replace function public.admin_create_bank(
  p_serial text,
  p_name text default 'Celengan Baru',
  p_owner_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare v_id uuid;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Admin only';
  end if;

  insert into public.piggy_banks(serial, name, owner_id)
  values (upper(trim(p_serial)), left(trim(coalesce(p_name, 'Celengan Baru')), 100), p_owner_id)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.admin_create_bank(text, text, uuid) to authenticated;

-- Secure public lookup returns no owner or private financial information.
create or replace function public.public_bank_lookup(p_serial text)
returns table(serial text, name text, status text)
language sql
security definer
set search_path = ''
as $$
  select b.serial, b.name, b.status
  from public.piggy_banks b
  where upper(b.serial) = upper(trim(p_serial))
    and b.status = 'active'
  limit 1;
$$;

grant execute on function public.public_bank_lookup(text) to anon, authenticated;


-- Pesanan celengan fisik: member memesan, admin memperbarui status dan resi.
create table if not exists public.piggy_bank_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_name text not null check (char_length(recipient_name) between 1 and 120),
  phone text not null check (char_length(phone) between 6 and 30),
  address text not null check (char_length(address) between 8 and 1000),
  quantity integer not null default 1 check (quantity between 1 and 10),
  note text not null default '',
  status text not null default 'pending' check (status in ('pending','confirmed','processing','shipped','delivered','received','cancelled')),
  tracking_number text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_user_created on public.piggy_bank_orders(user_id, created_at desc);
alter table public.piggy_bank_orders enable row level security;
drop policy if exists "Members create own orders" on public.piggy_bank_orders;
create policy "Members create own orders" on public.piggy_bank_orders for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pending');
drop policy if exists "Members read own orders" on public.piggy_bank_orders;
create policy "Members read own orders" on public.piggy_bank_orders for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Admins manage orders" on public.piggy_bank_orders;
create policy "Admins manage orders" on public.piggy_bank_orders for all to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
drop policy if exists "Members confirm received orders" on public.piggy_bank_orders;
create policy "Members confirm received orders" on public.piggy_bank_orders for update to authenticated using (user_id = (select auth.uid()) and status = 'delivered') with check (user_id = (select auth.uid()) and status = 'received');
