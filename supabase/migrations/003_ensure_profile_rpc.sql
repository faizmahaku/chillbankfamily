-- Nabungin: perbaikan permanen "Profil belum tersedia".
-- Aman dijalankan berulang. Jalankan di Supabase Dashboard -> SQL Editor -> Run.
begin;

-- Pastikan kolom yang dibaca aplikasi ada (tabel lama bisa belum punya phone/bio).
alter table public.profiles add column if not exists phone text not null default '';
alter table public.profiles add column if not exists bio text not null default '';

-- Backfill semua user Auth yang belum punya profil.
insert into public.profiles (id, full_name, phone, bio, role)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', ''), '', '', 'member'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Dipanggil aplikasi saat login jika profil belum ada (jaring pengaman jika trigger gagal/belum terpasang).
-- Hanya membuat profil untuk user yang sedang login, role selalu 'member'.
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
    raise exception 'Login required';
  end if;
  insert into public.profiles (id, full_name)
  select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', '')
  from auth.users u
  where u.id = v_uid
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;

commit;

-- Verifikasi: harus 0
select count(*) as auth_users_missing_profiles
from auth.users u left join public.profiles p on p.id = u.id
where p.id is null;
