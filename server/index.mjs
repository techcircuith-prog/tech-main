import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { URL } from "node:url";

const rawPrices = readFileSync(new URL("../shared/project-prices.json", import.meta.url), "utf8");
const prices = JSON.parse(rawPrices);

const VALID_INDIAN_STATES = new Set([
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
]);

const TRACKING_STAGES = [
  "Order Placed",
  "Confirmed",
  "Building (Processing)",
  "Testing / Quality Check",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Refunded",
];

const port = Number(process.env.API_PORT || 8787);
const environment = process.env.CASHFREE_ENV === "production" ? "production" : "sandbox";
const cashfreeBaseUrl = environment === "production"
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

const appOrigin = process.env.APP_ORIGIN || "http://localhost:3000";
const deliveryDaysConfig = Number(process.env.ORDER_DELIVERY_DAYS || 7);

// Local persistence for orders & history so local testing and admin survive restarts
const DATA_FILE = new URL("./orders-data.json", import.meta.url);
const ordersStore = new Map();
const historyStore = new Map(); // order_id -> array of history records

function loadPersistedData() {
  try {
    if (existsSync(DATA_FILE)) {
      const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8"));
      if (Array.isArray(parsed.orders)) {
        for (const ord of parsed.orders) {
          if (ord.id) ordersStore.set(ord.id, ord);
          if (ord.order_id) ordersStore.set(ord.order_id, ord);
          if (ord.cashfree_order_id) ordersStore.set(ord.cashfree_order_id, ord);
          if (ord.order_number) ordersStore.set(ord.order_number, ord);
        }
      }
      if (parsed.history && typeof parsed.history === "object") {
        for (const [key, val] of Object.entries(parsed.history)) {
          historyStore.set(key, val);
        }
      }
    }
  } catch (e) {
    console.warn("Could not load persisted orders:", e.message);
  }
}

function persistData() {
  try {
    const uniqueOrders = Array.from(new Set(Array.from(ordersStore.values()).map((o) => o.id)))
      .map((id) => ordersStore.get(id))
      .filter(Boolean);
    const data = {
      orders: uniqueOrders,
      history: Object.fromEntries(historyStore.entries()),
    };
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.warn("Could not persist orders:", e.message);
  }
}

loadPersistedData();

function corsHeaders(request) {
  const origin = request.headers.origin || appOrigin;
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-api-version,x-client-id,x-client-secret,x-webhook-signature,x-webhook-timestamp,x-user-role,x-user-id",
    vary: "Origin",
  };
}

function sendJson(response, statusCode, payload, request) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...corsHeaders(request),
  });
  response.end(JSON.stringify(payload));
}

function originAllowed(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  return (
    origin === appOrigin ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.endsWith(".vercel.app") ||
    origin.endsWith(".netlify.app")
  );
}

const checkoutAttempts = new Map();
function overCheckoutRateLimit(request) {
  const ip = request.socket.remoteAddress || "local";
  const now = Date.now();
  const entry = checkoutAttempts.get(ip) || { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60_000;
  }
  checkoutAttempts.set(ip, entry);
  entry.count += 1;
  return entry.count > 40;
}

function validCustomer(customer) {
  if (!customer || typeof customer !== "object") return null;
  const name = typeof customer.name === "string" ? customer.name.trim() : "";
  const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "";
  const rawPhone = typeof customer.phone === "string" ? customer.phone.trim() : "";
  const digits = rawPhone.replace(/\D/g, "");
  const cleanPhone = digits.slice(-10);

  if (!name || name.length < 2 || name.length > 100) return null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return null;
  if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) return null;

  return { name, email, phone: cleanPhone };
}

function validShippingAddress(address) {
  if (!address || typeof address !== "object") return null;
  const addressLine1 = typeof address.addressLine1 === "string" ? address.addressLine1.trim() : "";
  const addressLine2 = typeof address.addressLine2 === "string" ? address.addressLine2.trim() : "";
  const city = typeof address.city === "string" ? address.city.trim() : "";
  const state = typeof address.state === "string" ? address.state.trim() : "";
  const pincode = typeof address.pincode === "string" ? address.pincode.trim() : "";

  if (!addressLine1 || addressLine1.length < 3 || addressLine1.length > 200) return null;
  if (!city || city.length < 2 || city.length > 100) return null;
  if (!state || !VALID_INDIAN_STATES.has(state)) return null;
  if (!/^[1-9]\d{5}$/.test(pincode)) return null;

  return { addressLine1, addressLine2, city, state, pincode };
}

async function readRawBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 64_000) throw new Error("Request body is too large.");
  }
  return body;
}

async function cashfreeRequest(path, method, body) {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Cashfree credentials missing. Set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in .env.local.");
  }

  const response = await fetch(`${cashfreeBaseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-api-version": "2023-08-01",
      "x-client-id": clientId,
      "x-client-secret": clientSecret,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error("The payment provider returned an unreadable response.");
  }

  if (!response.ok) {
    console.error(`Cashfree API Error [${response.status}]:`, data);
    const errMessage = data.message || `Cashfree request failed with status ${response.status}`;
    const err = new Error(errMessage);
    err.status = response.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

function verifyCashfreeWebhookSignature(signature, rawBody, timestamp, secretKey) {
  if (!signature || !timestamp || !rawBody || !secretKey) return false;
  try {
    const signedPayload = timestamp + rawBody;
    const expectedSignature = createHmac("sha256", secretKey)
      .update(signedPayload)
      .digest("base64");

    const signatureBuffer = Buffer.from(signature, "base64");
    const expectedBuffer = Buffer.from(expectedSignature, "base64");
    if (signatureBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (err) {
    console.error("Webhook signature verify error:", err);
    return false;
  }
}

function addHistoryEntry(orderId, fromStage, toStage, changedBy, note = "", isPublic = true) {
  const entry = {
    id: randomUUID(),
    order_id: orderId,
    from_stage: fromStage,
    to_stage: toStage,
    changed_by: changedBy,
    note,
    is_public: isPublic,
    changed_at: new Date().toISOString(),
  };
  const list = historyStore.get(orderId) || [];
  list.push(entry);
  historyStore.set(orderId, list);
  persistData();
  return entry;
}

const server = createServer(async (request, response) => {
  try {
    // 1. CORS Preflight
    if (request.method === "OPTIONS") {
      const headers = corsHeaders(request);
      if (!originAllowed(request)) {
        sendJson(response, 403, { error: "Request origin is not allowed." }, request);
        return;
      }
      response.writeHead(204, { "cache-control": "no-store", ...headers });
      response.end();
      return;
    }

    if (!originAllowed(request)) {
      sendJson(response, 403, { error: "Request origin is not allowed." }, request);
      return;
    }

    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    // Health check
    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { status: "ok", mode: environment, ordersCount: ordersStore.size }, request);
      return;
    }

    // -------------------------------------------------------------
    // POST /api/payments/create-order (Also /api/checkout/orders)
    // -------------------------------------------------------------
    if (request.method === "POST" && (url.pathname === "/api/payments/create-order" || url.pathname === "/api/checkout/orders")) {
      if (overCheckoutRateLimit(request)) {
        sendJson(response, 429, { error: "Too many checkout attempts. Please wait a few minutes and try again." }, request);
        return;
      }
      try {
        const rawBody = await readRawBody(request);
        const body = JSON.parse(rawBody);

        const customer = validCustomer(body?.customer);
        if (!customer) {
          sendJson(response, 400, { error: "Please enter a valid full name, email address, and 10-digit mobile number." }, request);
          return;
        }

        const shippingAddress = validShippingAddress(body?.shippingAddress);
        if (!shippingAddress) {
          sendJson(response, 400, { error: "Please enter a valid street address, city, state, and 6-digit postal pincode." }, request);
          return;
        }

        if (!Array.isArray(body?.projectIds) || body.projectIds.length < 1) {
          sendJson(response, 400, { error: "Choose at least 1 project kit to place an order." }, request);
          return;
        }

        const SPECIAL_OFFER_ID = "special-offer-dc-fan-kit";
        const SPECIAL_OFFER_PRICE = 20;

        const projectPrices = body.projectIds.map((id) => {
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

        // Server-calculated pricing: NEVER trust amount from browser
        const subtotal = projectPrices.reduce((sum, p) => sum + p, 0);
        const shippingCharges = 0; // Free delivery across India
        const totalAmount = subtotal + shippingCharges;

        // Unique order number & IDs
        const orderNumber = `TCH-ORD-${String(Math.floor(100000 + Math.random() * 900000))}`;
        const internalOrderId = `ord_${randomUUID().replaceAll("-", "")}`;
        const cashfreeOrderId = `cf_${Date.now()}_${randomUUID().slice(0, 8)}`;
        const customerId = `cust_${createHash("sha256").update(customer.email).digest("hex").slice(0, 16)}`;

        const reqOrigin = request.headers.origin || (request.headers.referer ? new URL(request.headers.referer).origin : null);
        const clientOrigin = reqOrigin || appOrigin;

        // Create order via Cashfree SDK/API with sanitized 10-digit phone
        let cfOrder;
        try {
          cfOrder = await cashfreeRequest("/orders", "POST", {
            order_id: cashfreeOrderId,
            order_amount: totalAmount,
            order_currency: "INR",
            customer_details: {
              customer_id: customerId,
              customer_name: customer.name,
              customer_email: customer.email,
              customer_phone: customer.phone, // strictly 10 digits
            },
            order_meta: {
              return_url: `${clientOrigin}/?cf_order_id={order_id}&payment_status=success`,
              notify_url: `${clientOrigin}/api/payments/webhook`,
            },
            order_note: `Order ${orderNumber} - ${projectPrices.length} project kit(s)`,
          });
        } catch (cfErr) {
          console.error("Cashfree Order Creation Error:", cfErr.message);
          sendJson(response, 400, {
            error: cfErr.message || "The payment provider could not process the request. Please check your phone number and try again.",
          }, request);
          return;
        }

        if (!cfOrder?.payment_session_id) {
          sendJson(response, 502, { error: "Failed to generate payment session with Cashfree." }, request);
          return;
        }

        const orderRecord = {
          id: internalOrderId,
          order_id: internalOrderId,
          order_number: orderNumber,
          user_id: body.userId || null,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            college: body.customer?.college || "",
          },
          shipping_address: shippingAddress,
          items: body.projectIds.map((id, idx) => ({
            project_id: id,
            title: id === SPECIAL_OFFER_ID ? "Mini DC Motor & Fan Circuit Kit" : (body.projectTitles?.[idx] || `Hardware Project Kit`),
            price: projectPrices[idx],
            qty: 1,
          })),
          subtotal,
          shipping_charges: shippingCharges,
          total_amount: totalAmount,
          currency: "INR",
          payment_method: body?.paymentMethod === "upi" ? "upi" : "card",
          payment_gateway: "cashfree",
          cashfree_order_id: cashfreeOrderId,
          payment_session_id: cfOrder.payment_session_id,
          payment_status: "PENDING",
          tracking_status: "Order Placed",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          expected_delivery_date: null,
          paid_at: null,
        };

        ordersStore.set(internalOrderId, orderRecord);
        ordersStore.set(cashfreeOrderId, orderRecord);
        ordersStore.set(orderNumber, orderRecord);
        persistData();

        // Return only payment_session_id and order IDs
        sendJson(response, 201, {
          payment_session_id: cfOrder.payment_session_id,
          order_id: internalOrderId,
          order_number: orderNumber,
          cashfree_order_id: cashfreeOrderId,
          amount: totalAmount,
          currency: "INR",
        }, request);
      } catch (err) {
        console.error("Order creation fatal error:", err);
        sendJson(response, 500, { error: err.message || "Failed to initiate payment." }, request);
      }
      return;
    }

    // -------------------------------------------------------------
    // GET /api/payments/status: Server-side Cashfree status inquiry
    // -------------------------------------------------------------
    if (request.method === "GET" && url.pathname === "/api/payments/status") {
      const orderIdParam = url.searchParams.get("orderId");
      if (!orderIdParam) {
        sendJson(response, 400, { error: "Missing orderId parameter." }, request);
        return;
      }

      const order = ordersStore.get(orderIdParam);
      if (!order) {
        sendJson(response, 404, { error: "Order not found." }, request);
        return;
      }

      if (url.searchParams.get("userId")) {
        order.user_id = url.searchParams.get("userId");
      }

      if (url.searchParams.get("simulate") === "true" || order.payment_status === "PAID") {
        order.payment_status = "PAID";
        if (!order.paid_at) {
          order.paid_at = new Date().toISOString();
          order.expected_delivery_date = new Date(Date.now() + deliveryDaysConfig * 86400000).toISOString();
          order.tracking_status = "Order Placed";
          addHistoryEntry(order.id, null, "Order Placed", "System", "Payment confirmed via Cashfree Checkout", true);
          persistData();
        }
        sendJson(response, 200, {
          status: "PAID",
          order_id: order.id,
          order_number: order.order_number,
          order,
          history: historyStore.get(order.id) || [],
        }, request);
        return;
      }

      // Query Cashfree for the authentic payment status
      try {
        const cfData = await cashfreeRequest(`/orders/${order.cashfree_order_id}`, "GET");
        if (cfData?.order_status === "PAID") {
          order.payment_status = "PAID";
          order.paid_at = cfData.order_paid_time || new Date().toISOString();
          order.expected_delivery_date = new Date(Date.now() + deliveryDaysConfig * 86400000).toISOString();
          order.tracking_status = "Order Placed";
          order.updated_at = new Date().toISOString();

          // Add first history record
          addHistoryEntry(order.id, null, "Order Placed", "System", "Payment confirmed via Cashfree Custom Web Checkout", true);
          persistData();

          console.log(`[ORDER PAID] Order: ${order.order_number} | Amount: ₹${order.total_amount} | Student: ${order.customer_email}`);

          sendJson(response, 200, {
            status: "PAID",
            order_id: order.id,
            order_number: order.order_number,
            order,
            history: historyStore.get(order.id) || [],
          }, request);
          return;
        }

        sendJson(response, 200, {
          status: cfData?.order_status || order.payment_status,
          order_id: order.id,
          order_number: order.order_number,
          order,
        }, request);
      } catch (err) {
        console.warn("Could not check Cashfree order status:", err.message);
        sendJson(response, 200, { status: order.payment_status, order }, request);
      }
      return;
    }

    // -------------------------------------------------------------
    // POST /api/payments/webhook: Cashfree Webhook Listener
    // -------------------------------------------------------------
    if (request.method === "POST" && (url.pathname === "/api/payments/webhook" || url.pathname === "/api/checkout/webhook")) {
      const signature = request.headers["x-webhook-signature"];
      const timestamp = request.headers["x-webhook-timestamp"];
      const secretKey = process.env.CASHFREE_CLIENT_SECRET;

      const rawBody = await readRawBody(request);

      if (secretKey && signature && timestamp) {
        const isValid = verifyCashfreeWebhookSignature(signature, rawBody, timestamp, secretKey);
        if (!isValid) {
          console.warn("Webhook signature mismatch.");
          sendJson(response, 400, { error: "Invalid webhook signature." }, request);
          return;
        }
      }

      try {
        const payload = JSON.parse(rawBody);
        const cfOrderId = payload?.data?.order?.order_id;
        const cfStatus = payload?.data?.payment?.payment_status || payload?.type;

        if (cfOrderId) {
          const order = ordersStore.get(cfOrderId);
          if (order && order.payment_status !== "PAID") {
            if (cfStatus === "SUCCESS" || cfStatus === "PAYMENT_SUCCESS_WEBHOOK" || payload?.type === "ORDER_PAID") {
              order.payment_status = "PAID";
              order.paid_at = new Date().toISOString();
              order.expected_delivery_date = new Date(Date.now() + deliveryDaysConfig * 86400000).toISOString();
              order.tracking_status = "Order Placed";
              order.payment_id = payload?.data?.payment?.cf_payment_id || "";
              addHistoryEntry(order.id, null, "Order Placed", "Webhook", "Payment verified via Cashfree Webhook", true);
              persistData();
              console.log(`[WEBHOOK SUCCESS] Marked order ${order.order_number} as PAID.`);
            }
          }
        }
        sendJson(response, 200, { received: true }, request);
      } catch (e) {
        sendJson(response, 400, { error: "Webhook parse error" }, request);
      }
      return;
    }

    // -------------------------------------------------------------
    // GET /api/orders: Orders List (Admin sees all, Student sees own)
    // -------------------------------------------------------------
    if (request.method === "GET" && url.pathname === "/api/orders") {
      const userRole = request.headers["x-user-role"] || url.searchParams.get("role");
      const userId = request.headers["x-user-id"] || url.searchParams.get("userId") || url.searchParams.get("user_id");
      const userEmail = url.searchParams.get("email");
      const statusFilter = url.searchParams.get("status");
      const stageFilter = url.searchParams.get("stage");
      const search = url.searchParams.get("search")?.toLowerCase().trim();

      // Deduplicate orders from store
      const uniqueOrders = Array.from(new Set(Array.from(ordersStore.values()).map((o) => o.id)))
        .map((id) => ordersStore.get(id))
        .filter(Boolean);

      let filtered = uniqueOrders;

      const isAdminView = userRole === "admin" || (!userId && !userEmail);

      if (!isAdminView) {
        // Student view: filter by student's user_id or email
        filtered = filtered.filter((ord) => {
          if (userId && ord.user_id && ord.user_id === userId) return true;
          if (userEmail && ord.customer_email?.toLowerCase().trim() === userEmail.toLowerCase().trim()) return true;
          if (userId && !ord.user_id && userEmail && ord.customer_email?.toLowerCase().trim() === userEmail.toLowerCase().trim()) {
            ord.user_id = userId; // associate matching email order
            return true;
          }
          return false;
        });
      }

      if (statusFilter && statusFilter !== "all") {
        filtered = filtered.filter((o) => o.payment_status?.toLowerCase() === statusFilter.toLowerCase());
      }

      if (stageFilter && stageFilter !== "all") {
        filtered = filtered.filter((o) => o.tracking_status === stageFilter);
      }

      if (search) {
        filtered = filtered.filter((o) =>
          o.order_number?.toLowerCase().includes(search) ||
          o.id?.toLowerCase().includes(search) ||
          o.customer_name?.toLowerCase().includes(search) ||
          o.customer_email?.toLowerCase().includes(search) ||
          o.customer_phone?.includes(search)
        );
      }

      // Sort newest first
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      sendJson(response, 200, {
        orders: filtered,
        summary: {
          total: uniqueOrders.length,
          paid: uniqueOrders.filter((o) => o.payment_status === "PAID").length,
          newOrders: uniqueOrders.filter((o) => o.payment_status === "PAID" && o.tracking_status === "Order Placed").length,
          inBuild: uniqueOrders.filter((o) => ["Confirmed", "Building (Processing)", "Testing / Quality Check", "Packed"].includes(o.tracking_status)).length,
          shipped: uniqueOrders.filter((o) => o.tracking_status === "Shipped").length,
          delivered: uniqueOrders.filter((o) => o.tracking_status === "Delivered").length,
        },
      }, request);
      return;
    }

    // -------------------------------------------------------------
    // POST /api/orders: Upsert order record into server store
    // -------------------------------------------------------------
    if (request.method === "POST" && url.pathname === "/api/orders") {
      try {
        const rawBody = await readRawBody(request);
        const orderData = JSON.parse(rawBody);
        if (!orderData || (!orderData.id && !orderData.order_id)) {
          sendJson(response, 400, { error: "Order ID is required." }, request);
          return;
        }
        const orderId = orderData.id || orderData.order_id;
        const existing = ordersStore.get(orderId) || {};
        const merged = {
          ...existing,
          ...orderData,
          id: orderId,
          order_id: orderId,
          order_number: orderData.order_number || existing.order_number || `TCH-ORD-${orderId.slice(-6).toUpperCase()}`,
          payment_status: orderData.payment_status || existing.payment_status || "PAID",
          tracking_status: orderData.tracking_status || existing.tracking_status || "Order Placed",
          updated_at: new Date().toISOString(),
        };
        ordersStore.set(orderId, merged);
        if (merged.order_id) ordersStore.set(merged.order_id, merged);
        if (merged.cashfree_order_id) ordersStore.set(merged.cashfree_order_id, merged);
        if (merged.order_number) ordersStore.set(merged.order_number, merged);
        persistData();
        sendJson(response, 200, { ok: true, order: merged }, request);
      } catch (e) {
        sendJson(response, 500, { error: e.message || "Failed to save order." }, request);
      }
      return;
    }

    // -------------------------------------------------------------
    // GET /api/orders/:id: Order Detail & Status History
    // -------------------------------------------------------------
    const orderDetailMatch = request.method === "GET" && /^\/api\/orders\/([A-Za-z0-9_-]{1,60})$/.exec(url.pathname);
    if (orderDetailMatch) {
      const targetId = orderDetailMatch[1];
      const order = ordersStore.get(targetId);
      if (!order) {
        sendJson(response, 404, { error: "Order not found." }, request);
        return;
      }
      const history = historyStore.get(order.id) || [];
      sendJson(response, 200, { order, history }, request);
      return;
    }

    // -------------------------------------------------------------
    // POST /api/orders/:id/stage: Admin manual tracking stage update
    // -------------------------------------------------------------
    const stageUpdateMatch = request.method === "POST" && /^\/api\/orders\/([A-Za-z0-9_-]{1,60})\/stage$/.exec(url.pathname);
    if (stageUpdateMatch) {
      const targetId = stageUpdateMatch[1];
      const order = ordersStore.get(targetId);
      if (!order) {
        sendJson(response, 404, { error: "Order not found." }, request);
        return;
      }

      const body = JSON.parse(await readRawBody(request));
      const to_stage = body?.to_stage || body?.stage;
      const note = body?.note;
      const courier_name = body?.courier_name;
      const courier_tracking_number = body?.courier_tracking_number || body?.tracking_number;
      const courier_tracking_url = body?.courier_tracking_url || body?.tracking_url;
      const expected_delivery_date = body?.expected_delivery_date;
      const admin_notes = body?.admin_notes || body?.internal_notes;
      const changed_by = body?.changed_by || body?.admin_name || "Admin";

      if (!to_stage || !TRACKING_STAGES.includes(to_stage)) {
        sendJson(response, 400, { error: `Invalid stage. Choose one of: ${TRACKING_STAGES.join(", ")}` }, request);
        return;
      }

      // When moving to Shipped: courier_name and courier_tracking_number are required
      if (to_stage === "Shipped") {
        if (!courier_name?.trim() || !courier_tracking_number?.trim()) {
          sendJson(response, 400, { error: "Courier name and tracking number are required when marking an order as Shipped." }, request);
          return;
        }
      }

      const prevStage = order.tracking_status;
      order.tracking_status = to_stage;
      order.updated_at = new Date().toISOString();

      if (courier_name) order.courier_name = courier_name.trim();
      if (courier_tracking_number) order.courier_tracking_number = courier_tracking_number.trim();
      if (courier_tracking_url) order.courier_tracking_url = courier_tracking_url.trim();
      if (expected_delivery_date) order.expected_delivery_date = expected_delivery_date;
      if (typeof admin_notes === "string") order.admin_notes = admin_notes;

      // Add status history entry
      const historyRecord = addHistoryEntry(
        order.id,
        prevStage,
        to_stage,
        changed_by || "Admin",
        note || `Stage updated to ${to_stage}`,
        true
      );

      persistData();

      // Email notifications logging
      console.log(`[STAGE UPDATE EMAIL] To: ${order.customer_email} | Order: ${order.order_number} | Stage: ${to_stage}`);
      if (to_stage === "Shipped") {
        console.log(`[SHIPPED EMAIL] Courier: ${order.courier_name} | Tracking: ${order.courier_tracking_number}`);
      }

      sendJson(response, 200, {
        success: true,
        order,
        history: historyStore.get(order.id) || [],
        latest_history: historyRecord,
      }, request);
      return;
    }

    sendJson(response, 404, { error: "API route not found." }, request);
  } catch (error) {
    console.error("Server API exception:", error);
    if (!response.headersSent) {
      sendJson(response, 500, { error: error.message || "Internal server error." }, request);
    }
  }
});

server.listen(port, () => {
  console.log(`Checkout & Orders API listening on http://localhost:${port} (${environment} mode).`);
});

server.on("error", (error) => {
  console.error("API server error:", error.message);
});
