-- Migration: 20261031000000_allow_profile_insert_and_google_meta.sql
-- Description: Enables student profile self-provisioning on OAuth (Google) signup and ensures full metadata extraction

-- 1. Grant insert privilege on public.profiles to authenticated users
grant insert on public.profiles to authenticated;

-- 2. Allow authenticated users to insert their own profile row if one does not already exist
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

-- 3. Upgrade create_profile_for_new_user trigger function to extract Google OAuth metadata
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'user_name', ''),
      split_part(coalesce(new.email, ''), '@', 1),
      'Student'
    ),
    'student'
  )
  on conflict (id) do update set
    display_name = case
      when public.profiles.display_name is null or public.profiles.display_name = ''
      then excluded.display_name
      else public.profiles.display_name
    end;
  return new;
end;
$$;
