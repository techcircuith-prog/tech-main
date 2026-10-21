-- ==============================================================================
-- Migration: 20261020000000_internship_application_tracking.sql
-- Description: Internship and opportunity application tracking with unique IDs,
--              status management (Applied / Enrolled), self-reported / verified
--              tracking, and strict database Row Level Security.
-- ==============================================================================

create table if not exists public.applications (
  id text primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  opportunity_id text not null,
  opportunity_title text not null,
  opportunity_organization text not null default '',
  opportunity_city text not null default '',
  opportunity_kind text not null default 'Internships' check (opportunity_kind in ('Internships', 'Training', 'Hackathons')),
  opportunity_url text not null default '',
  status text not null default 'Applied' check (status in ('Applied', 'Enrolled', 'Withdrawn', 'Completed')),
  verification_status text not null default 'Self-reported' check (verification_status in ('Self-reported', 'Verified')),
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint applications_student_opportunity_unique unique (student_id, opportunity_id)
);

create index if not exists idx_applications_student on public.applications (student_id, applied_at desc);
create index if not exists idx_applications_opportunity on public.applications (opportunity_id);
create index if not exists idx_applications_status on public.applications (status);
create index if not exists idx_applications_applied_at on public.applications (applied_at desc);

alter table public.applications enable row level security;

-- Drop existing policies if re-run
drop policy if exists "Students can view their own applications" on public.applications;
drop policy if exists "Students can create their own applications" on public.applications;
drop policy if exists "Students can update their own applications" on public.applications;
drop policy if exists "Admins can view all applications" on public.applications;
drop policy if exists "Admins can update any application" on public.applications;
drop policy if exists "Admins can delete applications" on public.applications;

-- 1. Students can view only their own applications
create policy "Students can view their own applications"
  on public.applications for select to authenticated
  using (student_id = (select auth.uid()));

-- 2. Students can insert their own applications
create policy "Students can create their own applications"
  on public.applications for insert to authenticated
  with check (student_id = (select auth.uid()));

-- 3. Students can update their own applications (e.g. Applied -> Enrolled)
create policy "Students can update their own applications"
  on public.applications for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

-- 4. Admins can view all applications
create policy "Admins can view all applications"
  on public.applications for select to authenticated
  using ((select public.is_admin()));

-- 5. Admins can update any application (change status or mark Verified)
create policy "Admins can update any application"
  on public.applications for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- 6. Admins can delete applications
create policy "Admins can delete applications"
  on public.applications for delete to authenticated
  using ((select public.is_admin()));

grant select, insert, update, delete on public.applications to authenticated;
