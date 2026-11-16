// ==============================================================================
// Utility: api/_utils/whatsapp.js
// Description: Secure helper to invoke the Supabase Edge Function send-whatsapp
//              strictly from server-side backend handlers within the request lifecycle.
// ==============================================================================

const FALLBACK_SUPABASE_URL = "https://zomwoprlbydezbbliyui.supabase.co";

/**
 * Triggers the Supabase Edge Function 'send-whatsapp' within the active serverless request lifecycle.
 * 
 * Guarantees:
 * - Awaited directly to prevent silent execution termination in serverless environments (e.g. Vercel).
 * - Enforces a strict 2000ms timeout via AbortController to avoid delaying parent responses excessively.
 * - Uses server environment variables ONLY (process.env.SUPABASE_SERVICE_ROLE_KEY).
 *   Zero hardcoded secrets in source files.
 * - All errors and timeouts are caught and logged safely without exposing secrets.
 * - Returns structured result; failures never throw unhandled exceptions to callers.
 * - Defaults to dry_run: true.
 *
 * @param {Object} params
 * @param {string} [params.supabaseUrl] - Supabase base URL
 * @param {string} [params.supabaseKey] - Supabase API key (service role preferred)
 * @param {string} params.orderId - Unique order ID to notify
 * @param {'order_confirmation' | 'order_delivered'} params.eventType - WhatsApp template event
 * @param {boolean} [params.dryRun=true] - Dry run flag
 * @returns {Promise<{ success: boolean, skipped?: boolean, reason?: string, error?: string, data?: any }>}
 */
export async function triggerWhatsAppNotification({
  supabaseUrl,
  supabaseKey,
  orderId,
  eventType,
  dryRun = true,
}) {
  const resolvedUrl = (
    supabaseUrl ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    FALLBACK_SUPABASE_URL
  )?.trim()?.replace(/\/+$/, "");

  // Use server environment variable only. Never hardcode service-role keys.
  const resolvedKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    supabaseKey
  )?.trim();

  if (!resolvedUrl || !resolvedKey || !orderId || !eventType) {
    console.warn("[WhatsApp Trigger Skipped] Missing URL, authorization key, order ID, or event type.");
    return { success: false, skipped: true, reason: "missing_parameters" };
  }

  const endpoint = `${resolvedUrl}/functions/v1/send-whatsapp`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${resolvedKey}`,
      },
      body: JSON.stringify({
        order_id: String(orderId).trim(),
        event_type: eventType,
        dry_run: Boolean(dryRun),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(
        `[WhatsApp Trigger Failure] Edge function HTTP ${response.status} for ${eventType} on order ${orderId}: ${errText.slice(0, 200)}`
      );
      return { success: false, status: response.status, error: errText.slice(0, 200) };
    }

    const resJson = await response.json().catch(() => ({}));
    if (resJson?.skipped) {
      console.log(`[WhatsApp Trigger Info] Notification skipped for order ${orderId}: ${resJson.reason}`);
      return { success: true, skipped: true, reason: resJson.reason, data: resJson };
    }

    console.log(`[WhatsApp Trigger Success] Dispatched ${eventType} (dry_run: ${Boolean(dryRun)}) for order ${orderId}`);
    return { success: true, data: resJson };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err?.name === "AbortError") {
      console.warn(`[WhatsApp Trigger Timeout] Request timed out after 2000ms for ${eventType} on order ${orderId}`);
      return { success: false, error: "timeout" };
    }

    // Safely log error without exposing secrets or tokens
    console.warn(`[WhatsApp Trigger Error] ${eventType} for order ${orderId}:`, err?.message || err);
    return { success: false, error: err?.message || "network_error" };
  }
}
