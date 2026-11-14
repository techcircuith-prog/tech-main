-- ==============================================================================
-- Migration: 20261114000001_add_metadata_to_whatsapp_notifications.sql
-- Description: Adds message_id, error_details, and sent_at metadata columns
--              to whatsapp_notifications table.
-- ==============================================================================

ALTER TABLE public.whatsapp_notifications
  ADD COLUMN IF NOT EXISTS message_id TEXT,
  ADD COLUMN IF NOT EXISTS error_details TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
