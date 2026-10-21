-- ==============================================================================
-- Migration: 20261020000002_order_tracking_system.sql
-- Description: Orders management and manual order-tracking system.
--              Includes tracking stages, courier details, and append-only status history.
-- ==============================================================================

-- 1. Ensure orders table has all tracking and build-to-order columns
create table if not exists public.orders (
  id text primary key,
  order_number text,
  user_id uuid references public.profiles (id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address jsonb not null default '{}',
  items jsonb not null default '[]',
  subtotal numeric not null default 0,
  shipping_charges numeric not null default 0,
  total_amount numeric not null default 0,
  currency text not null default 'INR',
  payment_method text not null default 'card' check (payment_method in ('card', 'upi', 'netbanking')),
  payment_gateway text not null default 'cashfree',
  cashfree_order_id text,
  payment_session_id text,
  payment_id text,
  payment_signature text,
  payment_status text not null default 'PENDING' check (payment_status in ('PENDING', 'PAID', 'FAILED', 'CANCELLED')),
  tracking_status text not null default 'Order Placed' check (
    tracking_status in (
      'Order Placed',
      'Confirmed',
      'Building (Processing)',
      'Testing / Quality Check',
      'Packed',
      'Shipped',
      'Delivered',
      'Cancelled',
      'Refunded'
    )
  ),
  paid_at timestamptz,
  expected_delivery_date timestamptz,
  courier_name text,
  courier_tracking_number text,
  courier_tracking_url text,
  admin_notes text,
  public_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add any missing columns to existing orders table
alter table public.orders
  add column if not exists order_number text,
  add column if not exists payment_gateway text not null default 'cashfree',
  add column if not exists cashfree_order_id text,
  add column if not exists payment_session_id text,
  add column if not exists tracking_status text not null default 'Order Placed',
  add column if not exists paid_at timestamptz,
  add column if not exists expected_delivery_date timestamptz,
  add column if not exists courier_name text,
  add column if not exists courier_tracking_number text,
  add column if not exists courier_tracking_url text,
  add column if not exists admin_notes text,
  add column if not exists public_notes text;

-- Indexes on orders
create index if not exists idx_orders_user on public.orders (user_id, created_at desc);
create index if not exists idx_orders_status on public.orders (payment_status);
create index if not exists idx_orders_tracking on public.orders (tracking_status);
create index if not exists idx_orders_email on public.orders (customer_email);
create index if not exists idx_orders_number on public.orders (order_number);

-- 2. Append-only order status history table
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders (id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by text not null,
  changed_by_name text,
  note text,
  is_public boolean not null default true,
  changed_at timestamptz not null default now()
);

create index if not exists idx_status_history_order on public.order_status_history (order_id, changed_at asc);

-- 3. Row Level Security
alter table public.orders enable row level security;
alter table public.order_status_history enable row level security;

-- Orders RLS
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

-- Status history RLS
drop policy if exists "Users can view public history of their own orders" on public.order_status_history;
drop policy if exists "Admins can manage all order history" on public.order_status_history;

create policy "Users can view public history of their own orders"
  on public.order_status_history for select to authenticated
  using (
    (
      is_public = true
      and order_id in (select id from public.orders where user_id = (select auth.uid()))
    )
    or (select public.is_admin())
  );

create policy "Admins can manage all order history"
  on public.order_status_history for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select, insert, update on public.orders to authenticated;
grant select, insert on public.order_status_history to authenticated;
