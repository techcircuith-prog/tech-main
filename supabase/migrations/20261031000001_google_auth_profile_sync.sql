-- =====================================================================
-- Google OAuth & Student Profile Automatic Sync
-- Run this in your Supabase Dashboard -> SQL Editor
-- =====================================================================

-- 1. Add email and avatar_url columns to public.profiles if not present
alter table public.profiles
  add column if not exists email text default '',
  add column if not exists avatar_url text default '';

-- 2. Ensure authenticated users can insert their own profile
drop policy if exists "Allow authenticated users to insert their own profile" on public.profiles;
create policy "Allow authenticated users to insert their own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

-- 3. Trigger to automatically populate student profile on signup (Google OAuth or email)
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
      split_part(coalesce(new.email, ''), '@', 1),
      'Student'
    ),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', ''),
    'student'
  )
  on conflict (id) do update set
    display_name = case when public.profiles.display_name is null or public.profiles.display_name = '' then excluded.display_name else public.profiles.display_name end,
    email = case when public.profiles.email is null or public.profiles.email = '' then excluded.email else public.profiles.email end,
    avatar_url = case when public.profiles.avatar_url is null or public.profiles.avatar_url = '' then excluded.avatar_url else public.profiles.avatar_url end;
  return new;
end;
$$;

-- Ensure trigger is active on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();
