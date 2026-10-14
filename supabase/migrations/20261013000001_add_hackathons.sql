alter table public.listings
  drop constraint if exists listings_kind_check;

alter table public.listings
  add constraint listings_kind_check
  check (kind in ('Manufacturing', 'PCB Design', 'Internships', 'Training', 'Products', 'Projects', 'Hackathons'));
