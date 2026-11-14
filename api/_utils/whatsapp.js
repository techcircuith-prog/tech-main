// ==============================================================================
// Utility: api/_utils/whatsapp.js
// Description: Secure, non-blocking helper to invoke the Supabase Edge Function
//              send-whatsapp strictly from server-side backend handlers.
// ==============================================================================

const FALLBACK_SUPABASE_URL = "https://zomwoprlbydezbbliyui.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvbXdvcHJsYnlkZXpiYmxpeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4OTQ0MTEsImV4cCI6MjEwNzQ3MDQxMX0.ZsmboSVX_kN4J79tIbZBIbdFMIOijyhfqcayAbGHlt4";
const FALLBACK_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvbXdvcHJsYnlkZXpiYmxpeXVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTg5NDQxMSwiZXhwIjoyMTA3NDcwNDExfQ.qTZzgHN71Pn5bctKIihybqpOYJ1W6Y8DmQqB52VB_Jg";

/**
 * Triggers the Supabase Edge Function 'send-whatsapp' in a non-blocking, safe manner.
 * 
 * Guarantees:
 * - Always uses server-side credentials; never leaks to clients.
 * - Non-blocking: caught errors and timeouts will NEVER throw or interrupt
 *   payment verifications or order stage transitions.
 * - Defaults to dry_run: true while Meta templates are in review.
 *
 * @param {Object} params
 * @param {string} [params.supabaseUrl] - Supabase base URL
 * @param {string} [params.supabaseKey] - Supabase API key (service role preferred)
 * @param {string} params.orderId - Unique order ID to notify
 * @param {'order_confirmation' | 'order_delivered'} params.eventType - WhatsApp template event
 * @param {boolean} [params.dryRun=true] - Dry run flag
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

  // Ensure privileged server-to-server operations use the service role key
  const isAnonKey = (k) => !k || k === FALLBACK_SUPABASE_ANON_KEY || (typeof k === "string" && k.includes(".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvbXdvcHJsYnlkZXpiYmxpeXVpIiwicm9sZSI6ImFub24i"));

  const resolvedKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (supabaseKey && !isAnonKey(supabaseKey) ? supabaseKey : null) ||
    FALLBACK_SERVICE_ROLE_KEY
  )?.trim();

  if (!resolvedUrl || !resolvedKey || !orderId || !eventType) {
    console.warn("[WhatsApp Trigger] Skipped: missing URL, authorization key, order ID, or event type.");
    return;
  }

  try {
    const endpoint = `${resolvedUrl}/functions/v1/send-whatsapp`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

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
      console.warn(`[WhatsApp Trigger Notice] Edge function HTTP ${response.status} for ${eventType} on ${orderId}: ${errText.slice(0, 150)}`);
    } else {
      const resJson = await response.json().catch(() => ({}));
      if (resJson?.skipped) {
        console.log(`[WhatsApp Trigger Info] Notification skipped for ${orderId}: ${resJson.reason}`);
      } else {
        console.log(`[WhatsApp Trigger Success] Dispatched ${eventType} (dry_run: ${Boolean(dryRun)}) for ${orderId}`);
      }
    }
  } catch (err) {
    // Non-blocking: failures must never interrupt the primary transaction
    console.warn(`[WhatsApp Trigger Error] ${eventType} for ${orderId}:`, err?.message || err);
  }
}
