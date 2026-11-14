-- ==============================================================================
-- Migration: 20261114000000_add_whatsapp_opt_in_to_orders.sql
-- Description: Adds whatsapp_opt_in boolean column to orders table for
--              WhatsApp order confirmation & delivery updates notification opt-in.
-- ==============================================================================

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

