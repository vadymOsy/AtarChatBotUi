const { verifySession, getOwnedConversation } = require("./_verify-session");

const WINDOW_MS = 24 * 60 * 60 * 1000;

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
  const conversation = await getOwnedConversation(token, conversationId, "id,last_customer_message_at");
  if (!conversation) {
    res.status(403).json({ error: "Not authorized for this conversation" });
    return;
  }

  // WhatsApp only allows free-form replies within 24h of the customer's last
  // message - sending outside that window risks Meta flagging/restricting
  // the number. Block it here, not just in the UI, in case a stale page or
  // a direct API call tries to send after the window has closed.
  const lastCustomerMessageAt = conversation.last_customer_message_at
    ? new Date(conversation.last_customer_message_at).getTime()
    : null;
  if (!lastCustomerMessageAt || Date.now() - lastCustomerMessageAt > WINDOW_MS) {
    res.status(422).json({
      error: "This conversation's 24-hour reply window has closed. The customer needs to message again before you can reply.",
      code: "WINDOW_CLOSED",
    });
    return;
  }

  const n8nRes = await fetch(`${process.env.N8N_BASE_URL}/webhook/owner-send-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [process.env.N8N_WEBHOOK_HEADER_NAME]: process.env.N8N_WEBHOOK_HEADER_VALUE,
    },
    // senderUserId comes from the session we just verified server-side, never
    // from the request body - the client can't spoof who actually sent this.
    body: JSON.stringify({ conversationId, message, senderUserId: user.id }),
  });

  const text = await n8nRes.text();
  res.status(n8nRes.status).send(text);
};
