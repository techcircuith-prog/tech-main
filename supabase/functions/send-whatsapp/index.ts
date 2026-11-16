// ==============================================================================
// Supabase Edge Function: send-whatsapp
// Path: supabase/functions/send-whatsapp/index.ts
// Description: Secure server-to-server WhatsApp order confirmation and delivery
//              notifications via Meta WhatsApp Cloud API for opted-in customers.
// ==============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  order_id: string;
  event_type?: "order_confirmation" | "order_delivered";
  notification_type?: "order_confirmation" | "order_delivered";
  dry_run?: boolean;
}

// Clean and normalize phone number into E.164 digits format (e.g. 919876543210)
function formatWhatsAppPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";

  // 10-digit Indian phone number -> prepend country code 91
  if (digits.length === 10) {
    return `91${digits}`;
  }
  // 11 digits starting with 0 -> replace leading 0 with 91
  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }
  // 12 digits starting with 91 -> return as-is
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }
  return digits;
}

// Formats product details string from orders.items JSON array
function formatProductDetails(items: unknown): string {
  if (!Array.isArray(items) || items.length === 0) {
    return "Hardware Project Kit";
  }

  const formatted = items
    .map((it) => {
      if (!it || typeof it !== "object") return "Hardware Kit";
      const title = String(it.title || it.name || "Hardware Kit").trim();
      const qty = Number(it.qty || it.quantity || 1);
      return qty > 1 ? `${title} (x${qty})` : title;
    })
    .filter(Boolean);

  return formatted.length > 0 ? formatted.join(", ") : "Hardware Project Kit";
}

// Formats full shipping address string from orders.shipping_address JSONB
function formatShippingAddress(addr: unknown): string {
  if (!addr || typeof addr !== "object") {
    return "Address on file";
  }

  const a = addr as Record<string, any>;
  const parts = [
    a.addressLine1 || a.address_line1 || "",
    a.addressLine2 || a.address_line2 || "",
    a.city || "",
    a.state || "",
    a.pincode || a.postal_code || "",
  ]
    .map((p) => String(p).trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Address on file";
}

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Only POST is accepted." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Load required environment variables (supporting exact Supabase project casing variants)
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const WHATSAPP_TOKEN =
    Deno.env.get("WHATSAPP_TOKEN") ||
    Deno.env.get("Whatsapp_Token") ||
    Deno.env.get("whatsapp_token");
  const PHONE_NUMBER_ID =
    Deno.env.get("PHONE_NUMBER_ID") ||
    Deno.env.get("Phone_Number_ID") ||
    Deno.env.get("phone_number_id");
  const GRAPH_API_VERSION =
    Deno.env.get("GRAPH_API_VERSION") ||
    Deno.env.get("Graph_API-Version") ||
    Deno.env.get("Graph_API_Version") ||
    Deno.env.get("graph_api_version") ||
    "v21.0";
  const GLOBAL_DRY_RUN = Deno.env.get("WHATSAPP_DRY_RUN") === "true";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Server configuration error: Supabase service role credentials missing." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    return new Response(
      JSON.stringify({ error: "Server configuration error: WhatsApp Cloud API credentials missing." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 3. Strict Security: Restrict invocation exclusively to trusted server callers with service role credentials
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized: Missing Authorization header." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const isAuthorizedServer =
    token === SUPABASE_SERVICE_ROLE_KEY ||
    (Boolean(Deno.env.get("SUPABASE_SECRET_KEYS")) && Deno.env.get("SUPABASE_SECRET_KEYS")!.includes(token)) ||
    (() => {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          return payload?.role === "service_role" && (payload?.ref === "zomwoprlbydezbbliyui" || payload?.iss === "supabase");
        }
      } catch {}
      return false;
    })();

  if (!isAuthorizedServer) {
    return new Response(
      JSON.stringify({
        error: "Forbidden: Restricted to trusted server-to-server callers with service role credentials.",
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 4. Parse request body and evaluate Dry-Run
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON request body." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);

  // Dry-run safety logic:
  // Defaults to true for all calls. Live mode is ONLY allowed if body.dry_run === false
  // AND the recipient is verified against the whitelist inside the Edge Function.
  const envDryRun = (Deno.env.get("WHATSAPP_DRY_RUN") || "").toLowerCase().trim();
  const isEnvForcedDryRun = envDryRun === "true";
  const isExplicitlyLive = body?.dry_run === false && url.searchParams.get("dry_run") !== "true";
  const isDryRun = isEnvForcedDryRun || !isExplicitlyLive;

  const orderId = body?.order_id?.trim();
  const eventType = body?.event_type || body?.notification_type;

  if (!orderId) {
    return new Response(JSON.stringify({ error: "Missing required field: 'order_id'." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (eventType !== "order_confirmation" && eventType !== "order_delivered") {
    return new Response(
      JSON.stringify({
        error: "Invalid event type. Must be either 'order_confirmation' or 'order_delivered'.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    // 5. Query order using secure server-side credentials
    const { data: order, error: orderFetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderFetchError || !order) {
      return new Response(JSON.stringify({ error: `Order with ID '${orderId}' not found.` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Opt-In Verification: Only send when orders.whatsapp_opt_in = true
    if (!order.whatsapp_opt_in) {
      return new Response(
        JSON.stringify({
          skipped: true,
          reason: "Customer opted out of WhatsApp updates (orders.whatsapp_opt_in is false).",
          order_id: orderId,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Order Status Verification
    if (eventType === "order_confirmation") {
      const paymentStatus = (order.payment_status || "").toUpperCase();
      if (paymentStatus !== "PAID") {
        return new Response(
          JSON.stringify({
            error: `Cannot send order_confirmation: payment_status is '${order.payment_status}', expected 'PAID'.`,
            order_id: orderId,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (eventType === "order_delivered") {
      const isDeliveredStage = order.tracking_status === "Delivered";

      let hasDeliveredHistory = false;
      if (!isDeliveredStage) {
        const { data: history } = await supabase
          .from("order_status_history")
          .select("to_stage")
          .eq("order_id", orderId)
          .eq("to_stage", "Delivered")
          .limit(1);

        hasDeliveredHistory = Array.isArray(history) && history.length > 0;
      }

      if (!isDeliveredStage && !hasDeliveredHistory) {
        return new Response(
          JSON.stringify({
            error: `Cannot send order_delivered: order tracking status is '${order.tracking_status}', expected 'Delivered'.`,
            order_id: orderId,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 8. Atomic Notification Claiming via PostgreSQL RPC with row-level locking
    // Ensures genuinely atomic claiming for BOTH new notifications and failed-notification retries.
    const { data: claimResult, error: claimError } = await supabase.rpc(
      "claim_whatsapp_notification",
      {
        p_order_id: orderId,
        p_notification_type: eventType,
        p_is_dry_run: isDryRun,
      }
    );

    if (claimError) {
      // REQUIREMENT 2: If notification reservation fails for any database reason, STOP.
      // Never continue to the Meta API without a successfully acquired reservation.
      console.error("[WhatsApp Reservation Error] Claim RPC failed:", claimError.message);
      return new Response(
        JSON.stringify({
          error: "Database reservation error: Failed to claim notification lock.",
          details: claimError.message,
          order_id: orderId,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!claimResult || !claimResult.claimed) {
      const reason = claimResult?.reason || "already_processed";
      const message =
        reason === "already_sent"
          ? `Notification '${eventType}' was already successfully sent for order '${orderId}'.`
          : reason === "currently_processing"
          ? `Concurrent send prevented: notification '${eventType}' is currently being processed by another worker for order '${orderId}'.`
          : `Notification '${eventType}' cannot be sent for order '${orderId}' (reason: ${reason}).`;

      return new Response(
        JSON.stringify({
          skipped: true,
          reason: message,
          order_id: orderId,
          status: claimResult?.current_status,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reservationId: string = String(claimResult.id);
    const isRetry: boolean = claimResult.is_retry === true;
    const previousStatus: string | null = claimResult.previous_status || null;

    // 9. Format destination phone number
    const formattedPhone = formatWhatsAppPhone(order.customer_phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      await supabase
        .from("whatsapp_notifications")
        .update({ status: "failed:invalid_phone", error_message: "Invalid phone number digits." })
        .eq("id", reservationId);

      return new Response(
        JSON.stringify({
          error: "Recipient phone number is invalid or missing international country digits.",
          order_id: orderId,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MANDATORY RECIPIENT WHITELIST GUARD (ENFORCED INSIDE EDGE FUNCTION):
    // Only +919080120654 is authorized to receive a live WhatsApp message during testing.
    const ALLOWED_TEST_RECIPIENTS = ["919080120654"];
    const isWhitelisted = ALLOWED_TEST_RECIPIENTS.includes(formattedPhone);

    if (!isDryRun && !isWhitelisted) {
      // Revert reservation so dry-run safety is preserved
      await supabase.rpc("release_whatsapp_dry_run", {
        p_order_id: orderId,
        p_notification_type: eventType,
        p_is_retry: isRetry,
        p_previous_status: previousStatus,
      });

      console.error(`[Recipient Whitelist Guard] Phone '${formattedPhone}' is NOT authorized for live messages.`);
      return new Response(
        JSON.stringify({
          error: "Forbidden: Recipient is not in the authorized live test whitelist.",
          order_id: orderId,
          recipient: formattedPhone,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 10. Strict Template Parameter Derivation (No arbitrary caller parameters accepted)
    let bodyParameters: Array<{ type: "text"; text: string }> = [];

    if (eventType === "order_confirmation") {
      // Exactly 5 parameters in this order:
      // 1. Customer name
      // 2. Order number
      // 3. Product details (from orders.items)
      // 4. Total amount
      // 5. Full shipping address
      bodyParameters = [
        { type: "text", text: String(order.customer_name || "Valued Customer").trim() },
        { type: "text", text: String(order.order_number || order.id).trim() },
        { type: "text", text: formatProductDetails(order.items) },
        { type: "text", text: `₹${order.total_amount || 0}` },
        { type: "text", text: formatShippingAddress(order.shipping_address) },
      ];
    } else if (eventType === "order_delivered") {
      // Exactly 2 parameters in this order:
      // 1. Customer name
      // 2. Feedback URL (https://techcircuithub.com/feedback)
      bodyParameters = [
        { type: "text", text: String(order.customer_name || "Valued Customer").trim() },
        { type: "text", text: "https://techcircuithub.com/feedback" },
      ];
    }

    // 11. Dry-Run Mode Guard: Complete all checks without dispatching real WhatsApp message
    if (isDryRun) {
      // Release reservation via RPC so dry-run never permanently locks out future real notifications
      await supabase.rpc("release_whatsapp_dry_run", {
        p_order_id: orderId,
        p_notification_type: eventType,
        p_is_retry: isRetry,
        p_previous_status: previousStatus,
      });

      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          message: "Dry-run verified successfully. No real WhatsApp message was sent.",
          order_id: orderId,
          event_type: eventType,
          recipient: formattedPhone,
          template: {
            name: eventType,
            language: "en",
            parameters_count: bodyParameters.length,
            parameters: bodyParameters,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 12. Dispatch to Meta WhatsApp Cloud API
    const metaPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "template",
      template: {
        name: eventType,
        language: {
          code: "en",
        },
        components: [
          {
            type: "body",
            parameters: bodyParameters,
          },
        ],
      },
    };

    const metaEndpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

    const metaRes = await fetch(metaEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metaPayload),
    });

    const metaData = await metaRes.json();
    const isSuccess = metaRes.ok && Boolean(metaData?.messages?.[0]?.id);
    const messageId = metaData?.messages?.[0]?.id || null;

    const nowIso = new Date().toISOString();
    const errorString = isSuccess ? null : String(metaData?.error?.message || metaRes.statusText || "api_error");
    const notificationPayload: Record<string, any> = {
      status: isSuccess ? "sent" : "failed",
      message_id: messageId || null,
      sent_at: isSuccess ? nowIso : null,
      error_message: errorString,
      error_details: errorString,
    };

    // 13. Update reservation with outcome
    const { error: updateErr } = await supabase
      .from("whatsapp_notifications")
      .update(notificationPayload)
      .eq("id", reservationId);

    if (updateErr) {
      // Fallback to basic status string if custom columns fail
      await supabase
        .from("whatsapp_notifications")
        .update({
          status: isSuccess
            ? (messageId ? `sent:${messageId}` : "sent")
            : `failed:${String(metaData?.error?.message || metaRes.statusText || "api_error").slice(0, 100)}`,
        })
        .eq("id", reservationId);
    }

    // 14. Return structured response (zero secret exposure)
    if (isSuccess) {
      return new Response(
        JSON.stringify({
          success: true,
          order_id: orderId,
          event_type: eventType,
          message_id: messageId,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errorMessage = metaData?.error?.message || "Meta WhatsApp Cloud API rejected request.";
      const errorCode = metaData?.error?.code || metaRes.status;

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          error_code: errorCode,
          order_id: orderId,
          event_type: eventType,
        }),
        {
          status: metaRes.status >= 400 && metaRes.status < 600 ? metaRes.status : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error processing notification." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
