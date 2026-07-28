const { verifySession } = require("./_verify-session");

// Proxies a mode/status change to n8n's "set-conversation-mode" webhook.
// Same pattern as send-message.js: verify the caller's Supabase session,
// then forward to n8n with the shared secret attached server-side.
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

  const { conversationId, mode, status } = req.body || {};
  const validModes = ["ai", "human", "paused", "closed"];
  if (!conversationId || !validModes.includes(mode)) {
    res.status(400).json({ error: "conversationId and a valid mode are required" });
    return;
  }

  const n8nRes = await fetch(`${process.env.N8N_BASE_URL}/webhook/set-conversation-mode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [process.env.N8N_WEBHOOK_HEADER_NAME]: process.env.N8N_WEBHOOK_HEADER_VALUE,
    },
    body: JSON.stringify({ conversationId, mode, status: status || null }),
  });

  const text = await n8nRes.text();
  res.status(n8nRes.status).send(text);
};
