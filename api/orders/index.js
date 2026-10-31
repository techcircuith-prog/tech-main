const FALLBACK_SUPABASE_URL = "https://zomwoprlbydezbbliyui.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvbXdvcHJsYnlkZXpiYmxpeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4OTQ0MTEsImV4cCI6MjEwNzQ3MDQxMX0.ZsmboSVX_kN4J79tIbZBIbdFMIOijyhfqcayAbGHlt4";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();

  const role = req.headers["x-user-role"] || req.query.role;
  const userId = req.headers["x-user-id"] || req.query.userId || req.query.user_id;
  const userEmail = req.headers["x-user-email"] || req.query.email;

  // Supabase fallback / environment
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

  if (req.method === "POST") {
    const body = req.body || {};
    // Handle stage update requests sent to /api/orders
    if (body.action === "update_stage" || (body.order_id && body.to_stage)) {
      const order_id = body.order_id || body.id;
      const to_stage = body.to_stage || body.stage;
      const courier_name = body.courier_name;
      const courier_tracking_number = body.courier_tracking_number || body.tracking_number;
      const courier_tracking_url = body.courier_tracking_url || body.tracking_url;
      const expected_delivery_date = body.expected_delivery_date;
      const admin_notes = body.admin_notes || body.internal_notes;
      const changed_by = body.changed_by || body.admin_name || "Admin";
      const note = body.note;

      let updatedOrder = null;
      if (supabaseUrl && supabaseKey && order_id) {
        try {
          const patchData = {
            tracking_status: to_stage,
            updated_at: new Date().toISOString(),
          };
          if (courier_name) patchData.courier_name = courier_name;
          if (courier_tracking_number) patchData.courier_tracking_number = courier_tracking_number;
          if (courier_tracking_url) patchData.courier_tracking_url = courier_tracking_url;
          if (expected_delivery_date) patchData.expected_delivery_date = expected_delivery_date;
          if (admin_notes) patchData.admin_notes = admin_notes;

          const patchRes = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order_id}`, {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
              apikey: supabaseKey,
              authorization: `Bearer ${supabaseKey}`,
              prefer: "return=representation",
            },
            body: JSON.stringify(patchData),
          });
          if (patchRes.ok) {
            const rows = await patchRes.json();
            if (rows && rows.length > 0) updatedOrder = rows[0];
          }

          await fetch(`${supabaseUrl}/rest/v1/order_status_history`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              apikey: supabaseKey,
              authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              order_id,
              to_stage,
              changed_by: changed_by || "Admin",
              note: note || `Stage updated to ${to_stage}`,
              is_public: true,
            }),
          });
        } catch (err) {
          console.error("Supabase stage update error in /api/orders:", err);
        }
      }
      return res.status(200).json({ success: true, tracking_status: to_stage, order: updatedOrder });
    }

    if (supabaseUrl && supabaseKey) {
      try {
        const orderPayload = req.body;
        // Strictly only allow saving orders that have payment_status === 'PAID'
        if (orderPayload && (orderPayload.payment_status === "PAID" || orderPayload.payment_status === "paid")) {
          const sRes = await fetch(`${supabaseUrl}/rest/v1/orders`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              apikey: supabaseKey,
              authorization: `Bearer ${supabaseKey}`,
              prefer: "resolution=merge-duplicates,return=representation",
            },
            body: JSON.stringify(orderPayload),
          });
          if (sRes.ok) {
            const data = await sRes.json();
            return res.status(200).json({ ok: true, order: data });
          } else {
            console.warn("Supabase POST order response not ok:", sRes.status, await sRes.text());
          }
        } else {
          return res.status(400).json({ error: "Cannot register an order before payment is completed." });
        }
      } catch (err) {
        console.error("Order Supabase save error:", err);
      }
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const singleId = req.query.id || req.query.order_id;
    const clearAll = req.query.all === "true" || req.query.test === "true";

    if (supabaseUrl && supabaseKey) {
      try {
        if (clearAll) {
          try {
            await fetch(`${supabaseUrl}/rest/v1/orders?id=neq.placeholder_none`, {
              method: "DELETE",
              headers: { apikey: supabaseKey, authorization: `Bearer ${supabaseKey}` },
            });
          } catch {}
          await fetch(`${supabaseUrl}/rest/v1/orders?id=neq.placeholder_none`, {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
              apikey: supabaseKey,
              authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ admin_notes: "deleted", tracking_status: "Deleted" }),
          });
          return res.status(200).json({ success: true, message: "All test orders removed." });
        } else if (singleId) {
          try {
            await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(singleId)}`, {
              method: "DELETE",
              headers: { apikey: supabaseKey, authorization: `Bearer ${supabaseKey}` },
            });
          } catch {}
          await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(singleId)}`, {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
              apikey: supabaseKey,
              authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ admin_notes: "deleted", tracking_status: "Deleted" }),
          });
          return res.status(200).json({ success: true, message: `Order ${singleId} removed.` });
        }
      } catch (err) {
        console.warn("Delete order error in /api/orders:", err);
      }
    }
    return res.status(200).json({ success: true });
  }

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (supabaseUrl && supabaseKey) {
    try {
      const url = new URL(`${supabaseUrl}/rest/v1/orders`);
      url.searchParams.set("select", "*");
      const singleId = req.query.id || req.query.order_id;
      if (singleId) {
        url.searchParams.set("id", `eq.${singleId}`);
      } else if (role !== "admin") {
        if (userId && userEmail) {
          url.searchParams.set("or", `(user_id.eq.${userId},customer_email.eq.${userEmail})`);
        } else if (userId) {
          url.searchParams.set("user_id", `eq.${userId}`);
        } else if (userEmail) {
          url.searchParams.set("customer_email", `eq.${userEmail}`);
        }
      }
      // Strictly only fetch paid orders from database
      url.searchParams.set("payment_status", "ilike.paid");
      url.searchParams.set("order", "created_at.desc");

      const sRes = await fetch(url.toString(), {
        headers: {
          apikey: supabaseKey,
          authorization: `Bearer ${supabaseKey}`,
        },
      });

      if (sRes.ok) {
        const orders = await sRes.json();
        const activeOrders = Array.isArray(orders)
          ? orders.filter(
              (o) =>
                o.payment_status?.toUpperCase() === "PAID" &&
                o.tracking_status !== "Payment Pending" &&
                o.admin_notes !== "deleted" &&
                o.tracking_status !== "Deleted"
            )
          : [];
        return res.status(200).json({ orders: activeOrders });
      } else {
        console.warn("Supabase GET orders response not ok:", sRes.status, await sRes.text());
      }
    } catch (err) {
      console.warn("Supabase orders query exception:", err);
    }
  }

  return res.status(200).json({ orders: [] });
}
