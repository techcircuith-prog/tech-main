// ==============================================================================
// Supabase Edge Function: send-whatsapp
// Path: supabase/functions/send-whatsapp/index.ts
// Description: Sends WhatsApp order confirmation and delivery notifications
//              via Meta WhatsApp Cloud API for opted-in customers.
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
  parameters?: Array<{ text?: string } | string>;
}

// Clean and normalize phone number into international digits format (e.g. 919876543210)
function formatWhatsAppPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  
  // 10 digits standard Indian phone number -> prepend country code 91
  if (digits.length === 10) {
    return `91${digits}`;
  }
  // 11 digits starting with 0 -> replace 0 with 91
  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }
  // 12 digits starting with 91 -> keep as is
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }
  return digits;
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

  // 2. Load required environment variables (with support for casing variants)
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

  // 3. Security: Validate incoming authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized: Missing Authorization header." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const isDirectServiceKey = token === SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  if (!isDirectServiceKey) {
    // If not matching service role directly, verify bearer token as a valid Supabase auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or expired authorization token." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // 4. Parse and validate request body
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON request body." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

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

    // 6. Check opt-in: ONLY send when orders.whatsapp_opt_in = true
    if (!order.whatsapp_opt_in) {
      return new Response(
        JSON.stringify({
          skipped: true,
          reason: "Customer opted out of WhatsApp updates (orders.whatsapp_opt_in is false).",
          order_id: orderId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 7. Event-specific business rule validation
    if (eventType === "order_confirmation") {
      const paymentStatus = (order.payment_status || "").toUpperCase();
      if (paymentStatus !== "PAID") {
        return new Response(
          JSON.stringify({
            error: `Cannot send order_confirmation: payment_status is '${order.payment_status}', expected 'PAID'.`,
            order_id: orderId,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
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
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 8. Idempotency: Check whatsapp_notifications table to prevent duplicate sends
    const { data: existingNotification } = await supabase
      .from("whatsapp_notifications")
      .select("id, status")
      .eq("order_id", orderId)
      .eq("notification_type", eventType)
      .maybeSingle();

    if (
      existingNotification &&
      (existingNotification.status === "sent" || existingNotification.status?.startsWith("sent:"))
    ) {
      return new Response(
        JSON.stringify({
          skipped: true,
          reason: `Notification '${eventType}' has already been successfully sent for order '${orderId}'.`,
          order_id: orderId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 9. Format and validate destination phone number
    const formattedPhone = formatWhatsAppPhone(order.customer_phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      return new Response(
        JSON.stringify({
          error: "Recipient phone number is invalid or missing country digits.",
          order_id: orderId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 10. Map order data into template variables
    let bodyParameters: Array<{ type: "text"; text: string }> = [];

    if (Array.isArray(body?.parameters) && body.parameters.length > 0) {
      bodyParameters = body.parameters.map((p) => ({
        type: "text",
        text: String(typeof p === "object" && p !== null && "text" in p ? p.text : p),
      }));
    } else if (eventType === "order_confirmation") {
      bodyParameters = [
        { type: "text", text: order.customer_name || "Valued Customer" },
        { type: "text", text: order.order_number || order.id },
        { type: "text", text: `₹${order.total_amount || 0}` },
      ];
    } else if (eventType === "order_delivered") {
      bodyParameters = [
        { type: "text", text: order.customer_name || "Valued Customer" },
        { type: "text", text: order.order_number || order.id },
        { type: "text", text: order.shipping_address?.city || "your registered address" },
      ];
    }

    // 11. Construct Meta WhatsApp Cloud API template request
    const metaPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "template",
      template: {
        name: eventType, // 'order_confirmation' or 'order_delivered'
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

    // Status value to store in database
    const statusToRecord = isSuccess
      ? (messageId ? `sent:${messageId}` : "sent")
      : "failed";

    // 12. Record outcome in whatsapp_notifications using UNIQUE(order_id, notification_type)
    try {
      await supabase
        .from("whatsapp_notifications")
        .upsert(
          {
            order_id: orderId,
            notification_type: eventType,
            status: statusToRecord,
          },
          { onConflict: "order_id,notification_type" }
        );
    } catch (dbErr: any) {
      console.warn("Notice: Could not record notification outcome:", dbErr?.message);
    }

    // 13. Return structured response (never expose tokens or secrets)
    if (isSuccess) {
      return new Response(
        JSON.stringify({
          success: true,
          order_id: orderId,
          event_type: eventType,
          message_id: messageId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

