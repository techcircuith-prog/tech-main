-- ==============================================================================
-- Migration: 20261114000002_atomic_whatsapp_claiming.sql
-- Description:
--   1. Ensures error_message and error_details columns exist on whatsapp_notifications.
--   2. Atomic notification claiming RPC with row-level locking for both new sends
--      and failed-notification retries. Concurrent retries will never send duplicates.
--   3. Atomic release helper for dry-run mode so dry-run tests never lock real sends.
-- ==============================================================================

-- 1. Ensure metadata columns exist
ALTER TABLE public.whatsapp_notifications
  ADD COLUMN IF NOT EXISTS message_id TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS error_details TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- 2. Atomic Notification Claiming RPC
CREATE OR REPLACE FUNCTION public.claim_whatsapp_notification(
  p_order_id TEXT,
  p_notification_type TEXT,
  p_is_dry_run BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row public.whatsapp_notifications%ROWTYPE;
  v_status_to_set TEXT;
  v_prev_status TEXT;
BEGIN
  v_status_to_set := CASE WHEN p_is_dry_run THEN 'dry_run_pending' ELSE 'pending' END;

  -- Phase 1: Try atomic insert for a new notification
  INSERT INTO public.whatsapp_notifications (order_id, notification_type, status)
  VALUES (p_order_id, p_notification_type, v_status_to_set)
  ON CONFLICT (order_id, notification_type) DO NOTHING
  RETURNING * INTO v_row;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'claimed', true,
      'id', v_row.id,
      'status', v_row.status,
      'is_retry', false,
      'previous_status', NULL
    );
  END IF;

  -- Phase 2: Row exists. Acquire row-level lock FOR UPDATE to prevent race conditions during retry
  SELECT * INTO v_row
  FROM public.whatsapp_notifications
  WHERE order_id = p_order_id AND notification_type = p_notification_type
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_found');
  END IF;

  -- If already sent, permanently disallow sending again
  IF v_row.status = 'sent' OR v_row.status LIKE 'sent:%' THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'reason', 'already_sent',
      'current_status', v_row.status
    );
  END IF;

  -- If currently being processed by another worker, disallow concurrent claiming
  IF v_row.status IN ('pending', 'processing', 'dry_run_pending') THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'reason', 'currently_processing',
      'current_status', v_row.status
    );
  END IF;

  -- Eligible for retry (e.g. status was failed or failed:*)
  v_prev_status := v_row.status;

  UPDATE public.whatsapp_notifications
  SET status = v_status_to_set,
      error_message = NULL,
      error_details = NULL
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'claimed', true,
    'id', v_row.id,
    'status', v_row.status,
    'is_retry', true,
    'previous_status', v_prev_status
  );
END;
$$;

-- 3. Release helper for dry-run mode
CREATE OR REPLACE FUNCTION public.release_whatsapp_dry_run(
  p_order_id TEXT,
  p_notification_type TEXT,
  p_is_retry BOOLEAN,
  p_previous_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_is_retry AND p_previous_status IS NOT NULL THEN
    UPDATE public.whatsapp_notifications
    SET status = p_previous_status
    WHERE order_id = p_order_id AND notification_type = p_notification_type;
  ELSE
    DELETE FROM public.whatsapp_notifications
    WHERE order_id = p_order_id AND notification_type = p_notification_type;
  END IF;
END;
$$;

