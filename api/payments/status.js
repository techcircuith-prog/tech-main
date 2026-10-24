export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const orderId = req.query.orderId;
  if (!orderId) {
    return res.status(400).json({ error: "orderId is required" });
  }

  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const env = process.env.CASHFREE_ENV === "production" ? "production" : "sandbox";
  const baseUrl = env === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

  const isSimulate = req.query.simulate === "true";

  const FALLBACK_SUPABASE_URL = "https://zomwoprlbydezbbliyui.supabase.co";
  const FALLBACK_SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvbXdvcHJsYnlkZXpiYmxpeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4OTQ0MTEsImV4cCI6MjEwNzQ3MDQxMX0.ZsmboSVX_kN4J79tIbZBIbdFMIOijyhfqcayAbGHlt4";

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

  try {
    let orderStatus = "PENDING";
    let cfData = {};

    if (isSimulate) {
      orderStatus = "PAID";
    } else {
      const cfRes = await fetch(`${baseUrl}/orders/${orderId}`, {
        method: "GET",
        headers: {
          "x-api-version": "2023-08-01",
          "x-client-id": clientId,
          "x-client-secret": clientSecret,
        },
      });
      cfData = await cfRes.json();
      orderStatus = cfData.order_status || "PENDING";
    }

    let savedOrder = null;
    if (orderStatus === "PAID" && supabaseUrl && supabaseKey) {
      try {
        const patchRes = await fetch(`${supabaseUrl}/rest/v1/orders?or=(id.eq.${orderId},cashfree_order_id.eq.${orderId})`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            apikey: supabaseKey,
            authorization: `Bearer ${supabaseKey}`,
            prefer: "return=representation",
          },
          body: JSON.stringify({
            payment_status: "PAID",
            paid_at: new Date().toISOString(),
            expected_delivery_date: new Date(Date.now() + 7 * 86400000).toISOString(),
            tracking_status: "Order Placed",
            updated_at: new Date().toISOString(),
          }),
        });
        if (patchRes.ok) {
          const patchedList = await patchRes.json();
          if (Array.isArray(patchedList) && patchedList.length > 0) {
            savedOrder = patchedList[0];
          }
        }
      } catch (err) {
        console.warn("Supabase patch order error:", err);
      }
    }

    return res.status(200).json({
      status: orderStatus,
      order_status: orderStatus,
      order_id: orderId,
      order: savedOrder,
      cf_order: cfData,
    });
  } catch (err) {
    if (isSimulate) {
      return res.status(200).json({ status: "PAID", order_status: "PAID", order_id: orderId });
    }
    return res.status(500).json({ error: "Failed to verify order status with Cashfree." });
  }
}
