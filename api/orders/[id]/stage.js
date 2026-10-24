const FALLBACK_SUPABASE_URL = "https://zomwoprlbydezbbliyui.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvbXdvcHJsYnlkZXpiYmxpeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4OTQ0MTEsImV4cCI6MjEwNzQ3MDQxMX0.ZsmboSVX_kN4J79tIbZBIbdFMIOijyhfqcayAbGHlt4";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query;
  const body = req.body || {};
  const to_stage = body.to_stage || body.stage;
  const note = body.note;
  const courier_name = body.courier_name;
  const courier_tracking_number = body.courier_tracking_number || body.tracking_number;
  const courier_tracking_url = body.courier_tracking_url || body.tracking_url;
  const expected_delivery_date = body.expected_delivery_date;
  const changed_by = body.changed_by || body.admin_name || "Admin";

  const TRACKING_STAGES = [
    "Order Placed", "Confirmed", "Building (Processing)", "Testing / Quality Check",
    "Packed", "Shipped", "Delivered", "Cancelled", "Refunded"
  ];

  if (!to_stage || !TRACKING_STAGES.includes(to_stage)) {
    return res.status(400).json({ error: `Invalid stage. Choose one of: ${TRACKING_STAGES.join(", ")}` });
  }

  if (to_stage === "Shipped" && (!courier_name || !courier_tracking_number)) {
    return res.status(400).json({ error: "Courier name and tracking number are required when shipping an order." });
  }

  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    FALLBACK_SUPABASE_URL
  )?.trim();
  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    FALLBACK_SUPABASE_ANON_KEY
  )?.trim();

  if (supabaseUrl && supabaseKey) {
    try {
      const patchData = {
        tracking_status: to_stage,
        updated_at: new Date().toISOString(),
      };
      if (courier_name) patchData.courier_name = courier_name;
      if (courier_tracking_number) patchData.courier_tracking_number = courier_tracking_number;
      if (courier_tracking_url) patchData.courier_tracking_url = courier_tracking_url;
      if (expected_delivery_date) patchData.expected_delivery_date = expected_delivery_date;

      await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          apikey: supabaseKey,
          authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(patchData),
      });

      await fetch(`${supabaseUrl}/rest/v1/order_status_history`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: supabaseKey,
          authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          order_id: id,
          to_stage,
          changed_by: changed_by || "Admin",
          note: note || `Stage updated to ${to_stage}`,
          is_public: true,
        }),
      });

      return res.status(200).json({ success: true, tracking_status: to_stage });
    } catch {
      return res.status(500).json({ error: "Failed to update order tracking stage." });
    }
  }

  return res.status(200).json({ success: true, tracking_status: to_stage });
}
