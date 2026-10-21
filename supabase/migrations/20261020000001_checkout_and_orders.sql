-- ==============================================================================
-- Migration: 20261020000001_checkout_and_orders.sql
-- Description: Adds shipping address fields to profiles and creates orders
--              table with Row Level Security for secure checkout.
-- ==============================================================================

-- 1. Add shipping address columns to profiles if not present
alter table public.profiles
  add column if not exists phone text not null default '',
  add column if not exists address_line1 text not null default '',
  add column if not exists address_line2 text not null default '',
  add column if not exists state text not null default '',
  add column if not exists pincode text not null default '',
  add column if not exists shipping_address jsonb not null default '{}';

-- 2. Create orders table
create table if not exists public.orders (
  id text primary key,
  user_id uuid references public.profiles (id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address jsonb not null default '{}',
  items jsonb not null default '[]',
  subtotal numeric not null default 0,
  shipping_charges numeric not null default 0,
  total_amount numeric not null default 0,
  payment_method text not null default 'card' check (payment_method in ('card', 'upi', 'netbanking')),
  payment_order_id text,
  payment_id text,
  payment_signature text,
  payment_status text not null default 'PENDING' check (payment_status in ('PENDING', 'PAID', 'FAILED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_user on public.orders (user_id, created_at desc);
create index if not exists idx_orders_status on public.orders (payment_status);
create index if not exists idx_orders_email on public.orders (customer_email);

-- 3. Row Level Security for orders
alter table public.orders enable row level security;

drop policy if exists "Users can view their own orders" on public.orders;
drop policy if exists "Users can insert their own orders" on public.orders;
drop policy if exists "Admins can view all orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;

create policy "Users can view their own orders"
  on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Users can insert their own orders"
  on public.orders for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Admins can view all orders"
  on public.orders for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can update orders"
  on public.orders for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select, insert, update on public.orders to authenticated;
