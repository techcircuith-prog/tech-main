-- ==============================================================================
-- TechCircuit Hub: Setup Orders & Tracking System in Supabase
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- Project: https://supabase.com/dashboard/project/zomwoprlbydezbbliyui/sql
-- ==============================================================================

-- 1. Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT,
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  shipping_charges NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT NOT NULL DEFAULT 'upi',
  payment_gateway TEXT NOT NULL DEFAULT 'cashfree',
  cashfree_order_id TEXT,
  payment_session_id TEXT,
  payment_id TEXT,
  payment_signature TEXT,
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  tracking_status TEXT NOT NULL DEFAULT 'Order Placed',
  paid_at TIMESTAMPTZ,
  expected_delivery_date TIMESTAMPTZ,
  courier_name TEXT,
  courier_tracking_number TEXT,
  courier_tracking_url TEXT,
  admin_notes TEXT,
  public_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON public.orders (tracking_status);
CREATE INDEX IF NOT EXISTS idx_orders_cashfree ON public.orders (cashfree_order_id);

-- 3. Create order_status_history table
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by TEXT NOT NULL DEFAULT 'system',
  changed_by_name TEXT,
  note TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_order ON public.order_status_history (order_id, changed_at ASC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- 5. Policies allowing users and serverless endpoints to read and write orders
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can select orders" ON public.orders;
CREATE POLICY "Public can select orders" ON public.orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can update orders" ON public.orders;
CREATE POLICY "Public can update orders" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert history" ON public.order_status_history;
CREATE POLICY "Public can insert history" ON public.order_status_history FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can select history" ON public.order_status_history;
CREATE POLICY "Public can select history" ON public.order_status_history FOR SELECT USING (true);

-- 6. Grant API permissions
GRANT ALL ON public.orders TO anon, authenticated, service_role;
GRANT ALL ON public.order_status_history TO anon, authenticated, service_role;
