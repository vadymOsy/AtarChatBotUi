const { verifySession } = require("./_verify-session");

// Proxies an owner-authored message to n8n's "owner-send-message" webhook.
// The n8n webhook secret lives only in this function's environment
// variables — it never reaches the browser.
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const user = await verifySession(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { conversationId, message } = req.body || {};
  if (!conversationId || !message) {
    res.status(400).json({ error: "conversationId and message are required" });
    return;
  }

  const n8nRes = await fetch(`${process.env.N8N_BASE_URL}/webhook/owner-send-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [process.env.N8N_WEBHOOK_HEADER_NAME]: process.env.N8N_WEBHOOK_HEADER_VALUE,
    },
    body: JSON.stringify({ conversationId, message }),
  });

  const text = await n8nRes.text();
  res.status(n8nRes.status).send(text);
};
