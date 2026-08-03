const { verifySession, userOwnsConversation } = require("./_verify-session");

// Proxies an owner-authored message to n8n's "owner-send-message" webhook.
// The n8n webhook secret lives only in this function's environment
// variables — it never reaches the browser.
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { user, token } = await verifySession(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { conversationId, message } = req.body || {};
  if (!conversationId || !message) {
    res.status(400).json({ error: "conversationId and message are required" });
    return;
  }

  // Multi-tenant guard: reject if this user's own business membership (via
  // RLS) doesn't include this conversation - prevents one business's owner
  // from messaging another business's customers by guessing a conversation id.
  if (!(await userOwnsConversation(token, conversationId))) {
    res.status(403).json({ error: "Not authorized for this conversation" });
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
