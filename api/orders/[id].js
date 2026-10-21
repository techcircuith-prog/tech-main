export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Order ID is required" });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const oRes = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${id}&select=*`, {
        headers: { apikey: supabaseKey, authorization: `Bearer ${supabaseKey}` },
      });
      const orders = await oRes.json();
      if (!orders || orders.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const hRes = await fetch(`${supabaseUrl}/rest/v1/order_status_history?order_id=eq.${id}&order=changed_at.asc&select=*`, {
        headers: { apikey: supabaseKey, authorization: `Bearer ${supabaseKey}` },
      });
      const history = await hRes.json();

      return res.status(200).json({ order: orders[0], history: history || [] });
    } catch (e) {
      return res.status(500).json({ error: "Failed to fetch order details" });
    }
  }

  return res.status(404).json({ error: "Order not found" });
}
