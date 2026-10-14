alter table public.profiles
  add column if not exists institution text not null default '',
  add column if not exists course text not null default '',
  add column if not exists city text not null default '',
  add column if not exists interests text[] not null default '{}';

create policy "Students can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = 'student'
  );
