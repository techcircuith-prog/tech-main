import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const prices = JSON.parse(readFileSync(new URL("../shared/project-prices.json", import.meta.url), "utf8"));
const port = Number(process.env.API_PORT || 8787);
const appOrigin = process.env.APP_ORIGIN || "http://localhost:5173";
const environment = process.env.CASHFREE_ENV || "sandbox";
const checkoutAttempts = new Map();
const cashfreeBaseUrl = environment === "production"
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

function originAllowed(request) {
  const origin = request.headers.origin;
  return origin === appOrigin;
}

function overCheckoutRateLimit(request) {
  const now = Date.now();
  const address = request.socket.remoteAddress || "unknown";
  const window = checkoutAttempts.get(address);
  if (!window || now - window.startedAt >= 10 * 60 * 1000) {
    checkoutAttempts.set(address, { startedAt: now, count: 1 });
    return false;
  }
  window.count += 1;
  return window.count > 10;
}

function validCustomer(customer) {
  if (!customer || typeof customer !== "object") return null;
  const name = typeof customer.name === "string" ? customer.name.trim() : "";
  const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "";
  const phone = typeof customer.phone === "string" ? customer.phone.trim() : "";
  const digits = phone.replace(/\D/g, "");
  if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || digits.length < 8 || digits.length > 15 || phone.length > 20) {
    return null;
  }
  return { name, email, phone };
}

async function readJsonBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_000) throw new Error("Request body is too large.");
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

async function cashfreeRequest(path, method, body) {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Payment checkout is not configured. Add Cashfree test credentials to .env.local.");
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
    console.error(`Cashfree API request failed with status ${response.status}.`);
    throw new Error("The payment provider could not process the request. Check the server credentials and try again.");
  }
  return data;
}

const server = createServer(async (request, response) => {
  if (!originAllowed(request)) {
    sendJson(response, 403, { error: "Request origin is not allowed." });
    return;
  }
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/checkout/orders") {
    if (overCheckoutRateLimit(request)) {
      sendJson(response, 429, { error: "Too many checkout attempts. Please wait a few minutes and try again." });
      return;
    }
    try {
      const body = await readJsonBody(request);
      const customer = validCustomer(body?.customer);
      if (!customer) {
        sendJson(response, 400, { error: "Enter a valid name, email address, and mobile number." });
        return;
      }
      if (!Array.isArray(body?.projectIds) || body.projectIds.length < 1 || body.projectIds.length > prices.length) {
        sendJson(response, 400, { error: "Choose between 1 and 42 projects." });
        return;
      }
      const projectNumbers = body.projectIds.map((id) => {
        const match = typeof id === "string" && /^sample-project-(\d{1,2})$/.exec(id);
        return match ? Number(match[1]) : 0;
      });
      if (projectNumbers.some((number) => number < 1 || number > prices.length) || new Set(projectNumbers).size !== projectNumbers.length) {
        sendJson(response, 400, { error: "The cart contains an invalid or duplicate project." });
        return;
      }
      if (!["sandbox", "production"].includes(environment)) {
        sendJson(response, 500, { error: "CASHFREE_ENV must be sandbox or production." });
        return;
      }
      const amount = projectNumbers.reduce((total, number) => total + prices[number - 1], 0);
      const orderId = `tc_${randomUUID().replaceAll("-", "")}`;
      const customerId = `student_${createHash("sha256").update(customer.email).digest("hex").slice(0, 20)}`;
      const createdOrder = await cashfreeRequest("/orders", "POST", {
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: customerId,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
        },
        order_meta: {
          return_url: `${appOrigin}/?payment_order_id={order_id}`,
        },
      });
      if (typeof createdOrder.payment_session_id !== "string" || !createdOrder.payment_session_id) {
        console.error("Cashfree created an order without a payment session.");
        sendJson(response, 502, { error: "The payment provider did not return a checkout session." });
        return;
      }
      sendJson(response, 201, {
        order_id: orderId,
        payment_session_id: createdOrder.payment_session_id,
        gateway_mode: environment,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Request body is too large.") {
        sendJson(response, 413, { error: error.message });
        return;
      }
      if (error instanceof Error && error.message === "Request body must be valid JSON.") {
        sendJson(response, 400, { error: error.message });
        return;
      }
      if (error instanceof Error && error.message.startsWith("Payment checkout is not configured.")) {
        sendJson(response, 503, { error: error.message });
        return;
      }
      console.error("Could not create Cashfree checkout order:", error instanceof Error ? error.message : "Unknown server error.");
      sendJson(response, 502, { error: error instanceof Error ? error.message : "Could not create a payment order." });
    }
    return;
  }

  const orderMatch = request.method === "GET" && /^\/api\/checkout\/orders\/([A-Za-z0-9_-]{1,45})$/.exec(url.pathname);
  if (orderMatch) {
    try {
      const order = await cashfreeRequest(`/orders/${encodeURIComponent(orderMatch[1])}`, "GET");
      sendJson(response, 200, {
        order_id: order.order_id,
        order_status: order.order_status,
        order_amount: order.order_amount,
        order_currency: order.order_currency,
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Payment checkout is not configured.")) {
        sendJson(response, 503, { error: error.message });
        return;
      }
      console.error("Could not verify Cashfree order:", error instanceof Error ? error.message : "Unknown server error.");
      sendJson(response, 502, { error: error instanceof Error ? error.message : "Could not verify payment status." });
    }
    return;
  }

  sendJson(response, 404, { error: "API route not found." });
});

server.listen(port, () => {
  console.log(`Checkout API listening on http://localhost:${port} (${environment} mode).`);
});

server.on("error", (error) => {
  console.error("Checkout API failed to start:", error.message);
  process.exitCode = 1;
});
