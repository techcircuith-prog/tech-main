import { createHmac, timingSafeEqual } from "node:crypto";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const signature = req.headers["x-webhook-signature"];
  const timestamp = req.headers["x-webhook-timestamp"];
  const secretKey = process.env.CASHFREE_CLIENT_SECRET;

  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

  if (secretKey && signature && timestamp) {
    try {
      const signedPayload = timestamp + rawBody;
      const expectedSignature = createHmac("sha256", secretKey)
        .update(signedPayload)
        .digest("base64");

      const sigBuf = Buffer.from(signature, "base64");
      const expBuf = Buffer.from(expectedSignature, "base64");
      if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
        return res.status(400).json({ error: "Invalid webhook signature." });
      }
    } catch {
      return res.status(400).json({ error: "Signature verification failed." });
    }
  }

  // Idempotent webhook response
  return res.status(200).json({ received: true });
}
