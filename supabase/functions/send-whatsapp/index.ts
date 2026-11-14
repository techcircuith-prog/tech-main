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
  const legacyServiceKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvbXdvcHJsYnlkZXpiYmxpeXVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTg5NDQxMSwiZXhwIjoyMTA3NDcwNDExfQ.qTZzgHN71Pn5bctKIihybqpOYJ1W6Y8DmQqB52VB_Jg";
  const isAuthorizedServer =
    token === SUPABASE_SERVICE_ROLE_KEY ||
    token === legacyServiceKey ||
    (Boolean(Deno.env.get("SUPABASE_SECRET_KEYS")) && Deno.env.get("SUPABASE_SECRET_KEYS")!.includes(token));

  if (!isAuthorizedServer) {
    return new Response(
      JSON.stringify({
        error: "Forbidden: Restricted to trusted server-to-server callers with service role credentials.",
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 4. Parse request body and check dry-run flag
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
  const isDryRun = GLOBAL_DRY_RUN || body?.dry_run === true || url.searchParams.get("dry_run") === "true";

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

    // 8. Race-safe Idempotency: Pre-check & Reserve row using UNIQUE(order_id, notification_type)
    const { data: existingNotification } = await supabase
      .from("whatsapp_notifications")
      .select("id, status")
      .eq("order_id", orderId)
      .eq("notification_type", eventType)
      .maybeSingle();

    if (existingNotification) {
      const st = (existingNotification.status || "").toLowerCase();
      if (st === "sent" || st.startsWith("sent:")) {
        return new Response(
          JSON.stringify({
            skipped: true,
            reason: `Notification '${eventType}' was already successfully sent for order '${orderId}'.`,
            order_id: orderId,
            status: existingNotification.status,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (st === "pending" || st === "processing") {
        return new Response(
          JSON.stringify({
            skipped: true,
            reason: `Notification '${eventType}' is currently being processed by another worker for order '${orderId}'.`,
            order_id: orderId,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Atomically reserve the record in the database
    let reservationId: string | null = existingNotification?.id || null;

    if (!existingNotification) {
      const { data: inserted, error: insertError } = await supabase
        .from("whatsapp_notifications")
        .insert([
          {
            order_id: orderId,
            notification_type: eventType,
            status: isDryRun ? "dry_run_pending" : "pending",
          },
        ])
        .select("id")
        .maybeSingle();

      if (insertError) {
        // Code 23505 = unique_violation (concurrent worker grabbed it first)
        if (insertError.code === "23505" || insertError.message?.toLowerCase().includes("unique")) {
          return new Response(
            JSON.stringify({
              skipped: true,
              reason: `Concurrent send prevented: notification '${eventType}' was already reserved for order '${orderId}'.`,
              order_id: orderId,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.warn("Notice: Reservation insert warning:", insertError.message);
      }
      reservationId = inserted?.id || null;
    } else {
      // Retry failed state
      await supabase
        .from("whatsapp_notifications")
        .update({ status: isDryRun ? "dry_run_pending" : "pending" })
        .eq("id", existingNotification.id);
    }

    // 9. Format destination phone number
    const formattedPhone = formatWhatsAppPhone(order.customer_phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      if (reservationId) {
        await supabase
          .from("whatsapp_notifications")
          .update({ status: "failed:invalid_phone" })
          .eq("id", reservationId);
      }
      return new Response(
        JSON.stringify({
          error: "Recipient phone number is invalid or missing international country digits.",
          order_id: orderId,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      // Revert reservation so dry-run never permanently locks out future real notifications
      if (reservationId && !existingNotification) {
        await supabase.from("whatsapp_notifications").delete().eq("id", reservationId);
      } else if (reservationId && existingNotification) {
        await supabase
          .from("whatsapp_notifications")
          .update({ status: existingNotification.status })
          .eq("id", reservationId);
      }

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
    const notificationPayload: Record<string, any> = {
      status: isSuccess ? "sent" : "failed",
      message_id: messageId || null,
      sent_at: isSuccess ? nowIso : null,
      error_details: isSuccess ? null : String(metaData?.error?.message || metaRes.statusText || "api_error"),
    };

    // 13. Update reservation with outcome (with graceful fallback if extra columns are omitted)
    if (reservationId) {
      const { error: updateErr } = await supabase
        .from("whatsapp_notifications")
        .update(notificationPayload)
        .eq("id", reservationId);

      if (updateErr) {
        // Fallback to basic status string
        await supabase
          .from("whatsapp_notifications")
          .update({
            status: isSuccess
              ? (messageId ? `sent:${messageId}` : "sent")
              : `failed:${String(metaData?.error?.message || metaRes.statusText || "api_error").slice(0, 100)}`,
          })
          .eq("id", reservationId);
      }
    } else {
      const { error: upsertErr } = await supabase
        .from("whatsapp_notifications")
        .upsert(
          {
            order_id: orderId,
            notification_type: eventType,
            ...notificationPayload,
          },
          { onConflict: "order_id,notification_type" }
        );

      if (upsertErr) {
        await supabase
          .from("whatsapp_notifications")
          .upsert(
            {
              order_id: orderId,
              notification_type: eventType,
              status: isSuccess
                ? (messageId ? `sent:${messageId}` : "sent")
                : `failed:${String(metaData?.error?.message || metaRes.statusText || "api_error").slice(0, 100)}`,
            },
            { onConflict: "order_id,notification_type" }
          );
      }
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
