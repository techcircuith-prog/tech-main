create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('Manufacturing', 'PCB Design', 'Internships', 'Training', 'Products', 'Projects', 'Hackathons')),
  title text not null,
  organization text not null,
  city text not null,
  summary text not null,
  tags text[] not null default '{}',
  components text[] not null default '{}',
  details jsonb not null default '{}',
  source_url text not null,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'source-linked', 'verified')),
  verified boolean not null default false,
  admin_notes text not null default '',
  is_published boolean not null default false,
  is_expired boolean not null default false,
  featured boolean not null default false,
  sponsored boolean not null default false,
  listing_plan text not null default 'free' check (listing_plan in ('free', 'featured', 'sponsored')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (source_url ~ '^https?://'),
  check (not is_published or verification_status in ('source-linked', 'verified')),
  check (not is_published or not is_expired)
);

create table public.bookmarks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  created_at timestamptz not null default now()
);

create index listings_public_discovery_idx on public.listings (kind, city) where is_published and not is_expired;
create index listings_updated_idx on public.listings (updated_at desc);
create index enquiries_created_idx on public.enquiries (created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.bookmarks enable row level security;
alter table public.enquiries enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Admins can update profiles"
  on public.profiles for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Public can read published listings"
  on public.listings for select to anon, authenticated
  using (
    (is_published and not is_expired and source_url is not null
      and verification_status in ('source-linked', 'verified'))
    or (select public.is_admin())
  );

create policy "Admins can manage listings"
  on public.listings for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Users can manage their own bookmarks"
  on public.bookmarks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can create enquiries"
  on public.enquiries for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.listings
      where id = listing_id and is_published and not is_expired
    )
    and (user_id is null or user_id = (select auth.uid()))
  );

create policy "Admins can manage enquiries"
  on public.enquiries for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select on public.listings to anon, authenticated;
grant select, insert, update, delete on public.listings to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, delete on public.bookmarks to authenticated;
grant insert on public.enquiries to anon, authenticated;
grant select, update, delete on public.enquiries to authenticated;
