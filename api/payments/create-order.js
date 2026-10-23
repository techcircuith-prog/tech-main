import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { URL } from "node:url";

const rawPrices = readFileSync(new URL("../../shared/project-prices.json", import.meta.url), "utf8");
const prices = JSON.parse(rawPrices);

const VALID_INDIAN_STATES = new Set([
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal"
]);

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const customer = body.customer;
    if (!customer || !customer.name || !customer.email || !customer.phone) {
      return res.status(400).json({ error: "Customer name, email and phone are required." });
    }

    const cleanPhone = customer.phone.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number." });
    }

    const addr = body.shippingAddress;
    if (!addr || !addr.addressLine1 || !addr.city || !addr.state || !addr.pincode) {
      return res.status(400).json({ error: "Complete delivery address with state and 6-digit pincode is required." });
    }
    if (!VALID_INDIAN_STATES.has(addr.state) || !/^[1-9]\d{5}$/.test(addr.pincode)) {
      return res.status(400).json({ error: "Invalid Indian state or 6-digit pincode." });
    }

    const projectIds = body.projectIds;
    if (!Array.isArray(projectIds) || projectIds.length < 1) {
      return res.status(400).json({ error: "Choose at least 1 project for checkout." });
    }

    const SPECIAL_OFFER_ID = "special-offer-dc-fan-kit";
    const SPECIAL_OFFER_PRICE = 20;

    const projectPrices = projectIds.map((id) => {
      if (id === SPECIAL_OFFER_ID) {
        return SPECIAL_OFFER_PRICE;
      }
      const match = typeof id === "string" && /(?:sample-)?project-(\d{1,2})$/.exec(id);
      const num = match ? Number(match[1]) : 0;
      if (num >= 1 && num <= prices.length) {
        return prices[num - 1] || 2999;
      }
      return 2999;
    });

    const subtotal = projectPrices.reduce((sum, p) => sum + p, 0);
    const shippingCharges = 0;
    const totalAmount = subtotal + shippingCharges;

    const clientId = process.env.CASHFREE_CLIENT_ID;
    const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
    const env = process.env.CASHFREE_ENV === "production" ? "production" : "sandbox";
    const baseUrl = env === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Cashfree credentials missing on server." });
    }

    const orderNumber = `TCH-ORD-${String(Math.floor(100000 + Math.random() * 900000))}`;
    const internalOrderId = `ord_${randomUUID().replaceAll("-", "")}`;
    const cashfreeOrderId = `cf_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const customerId = `cust_${createHash("sha256").update(customer.email).digest("hex").slice(0, 16)}`;

    const host = req.headers.host || "localhost:3000";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const appOrigin = `${protocol}://${host}`;

    const cfRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
      },
      body: JSON.stringify({
        order_id: cashfreeOrderId,
        order_amount: totalAmount,
        order_currency: "INR",
        customer_details: {
          customer_id: customerId,
          customer_name: customer.name.trim(),
          customer_email: customer.email.trim().toLowerCase(),
          customer_phone: cleanPhone,
        },
        order_meta: {
          return_url: `${appOrigin}/?cf_order_id={order_id}&payment_status=success`,
          notify_url: `${appOrigin}/api/payments/webhook`,
        },
        order_note: `Order ${orderNumber}`,
      }),
    });

    const cfData = await cfRes.json();
    if (!cfRes.ok || !cfData.payment_session_id) {
      console.error("Cashfree Vercel Error:", cfData);
      return res.status(400).json({ error: cfData.message || "Could not initialize Cashfree payment." });
    }

    return res.status(201).json({
      payment_session_id: cfData.payment_session_id,
      order_id: internalOrderId,
      order_number: orderNumber,
      cashfree_order_id: cashfreeOrderId,
      amount: totalAmount,
      currency: "INR",
    });
  } catch (err) {
    console.error("Create order handler exception:", err);
    return res.status(500).json({ error: err.message || "Failed to create order." });
  }
}
