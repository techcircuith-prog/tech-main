create index if not exists opportunity_activity_updated_idx
  on public.opportunity_activity (updated_at desc);

create policy "Admins can read all opportunity activity"
  on public.opportunity_activity for select to authenticated
  using ((select public.is_admin()));
