create table public.opportunity_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id text not null,
  opportunity_kind text not null check (opportunity_kind in ('Internships', 'Training', 'Hackathons')),
  title text not null,
  organization text not null,
  city text not null,
  opportunity_url text not null check (opportunity_url ~ '^https?://'),
  status text not null check (status in ('visited', 'applied')),
  visited_at timestamptz not null default now(),
  applied_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, opportunity_id),
  check ((status = 'visited' and applied_at is null) or (status = 'applied' and applied_at is not null))
);

create index opportunity_activity_user_updated_idx
  on public.opportunity_activity (user_id, updated_at desc);

alter table public.opportunity_activity enable row level security;

create policy "Students can manage their own opportunity activity"
  on public.opportunity_activity for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.opportunity_activity to authenticated;
