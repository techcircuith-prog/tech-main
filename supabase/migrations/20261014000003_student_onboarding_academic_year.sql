alter table public.profiles
  add column if not exists academic_year text not null default '';
