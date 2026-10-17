-- Nabungin: repair profiles for users who registered before the profile trigger was installed.
-- Safe to run more than once. Existing profile rows and roles are preserved.
begin;

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

-- Ensure the trigger exists for future registrations as well.
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

commit;

-- Verification: this should return 0.
select count(*) as auth_users_missing_profiles
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
