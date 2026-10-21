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

  try {
    const cfRes = await fetch(`${baseUrl}/orders/${orderId}`, {
      method: "GET",
      headers: {
        "x-api-version": "2023-08-01",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
      },
    });

    const cfData = await cfRes.json();
    return res.status(200).json({
      status: cfData.order_status || "PENDING",
      order_id: orderId,
      cf_order: cfData,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to verify order status with Cashfree." });
  }
}
