-- =====================================================================
-- Google OAuth & Student Profile Automatic Sync
-- Run this in your Supabase Dashboard -> SQL Editor
-- =====================================================================

-- 1. Add email and avatar_url columns to public.profiles if not present
alter table public.profiles
  add column if not exists email text default '',
  add column if not exists avatar_url text default '';

-- 2. Grant permissions to authenticated role
grant select, insert, update on public.profiles to authenticated;

-- 3. Ensure authenticated users can insert and update their own profile
drop policy if exists "Allow authenticated users to insert their own profile" on public.profiles;
create policy "Allow authenticated users to insert their own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

-- 4. Trigger function to automatically populate/sync student profile on signup and login (Google OAuth or email)
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'user_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'given_name'), ''),
      split_part(coalesce(new.email, ''), '@', 1),
      'Student'
    ),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', ''),
    'student'
  )
  on conflict (id) do update set
    display_name = case when public.profiles.display_name is null or public.profiles.display_name = '' or public.profiles.display_name = 'Student' then excluded.display_name else public.profiles.display_name end,
    email = case when public.profiles.email is null or public.profiles.email = '' then excluded.email else public.profiles.email end,
    avatar_url = case when public.profiles.avatar_url is null or public.profiles.avatar_url = '' then excluded.avatar_url else public.profiles.avatar_url end;
  return new;
end;
$$;

-- Ensure trigger is active on auth.users for new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

-- Ensure trigger also syncs on subsequent OAuth logins
drop trigger if exists on_auth_user_login on auth.users;
create trigger on_auth_user_login
  after update of last_sign_in_at on auth.users
  for each row execute procedure public.create_profile_for_new_user();

-- 5. Backfill any existing users in auth.users that are missing a profile
insert into public.profiles (id, display_name, email, avatar_url, role)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'user_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'given_name'), ''),
    split_part(coalesce(u.email, ''), '@', 1),
    'Student'
  ),
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture', ''),
  'student'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do update set
  display_name = case when public.profiles.display_name is null or public.profiles.display_name = '' or public.profiles.display_name = 'Student' then excluded.display_name else public.profiles.display_name end,
  email = case when public.profiles.email is null or public.profiles.email = '' then excluded.email else public.profiles.email end,
  avatar_url = case when public.profiles.avatar_url is null or public.profiles.avatar_url = '' then excluded.avatar_url else public.profiles.avatar_url end;

