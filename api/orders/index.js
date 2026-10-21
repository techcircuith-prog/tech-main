export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const role = req.headers["x-user-role"] || req.query.role;
  const userId = req.headers["x-user-id"] || req.query.userId || req.query.user_id;
  const userEmail = req.headers["x-user-email"] || req.query.email;

  // Supabase fallback / environment
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const url = new URL(`${supabaseUrl}/rest/v1/orders`);
      url.searchParams.set("select", "*");
      if (role !== "admin") {
        if (userId) {
          url.searchParams.set("user_id", `eq.${userId}`);
        } else if (userEmail) {
          url.searchParams.set("customer_email", `eq.${userEmail}`);
        }
      }
      url.searchParams.set("order", "created_at.desc");

      const sRes = await fetch(url.toString(), {
        headers: {
          apikey: supabaseKey,
          authorization: `Bearer ${supabaseKey}`,
        },
      });

      if (sRes.ok) {
        const orders = await sRes.json();
        return res.status(200).json({ orders });
      }
    } catch {
      // Continue to empty list
    }
  }

  return res.status(200).json({ orders: [] });
}
