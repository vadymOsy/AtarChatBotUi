// Conversation detail: history + realtime + mode/status controls + owner
// send box. Sending a message and changing mode both go through the two
// serverless functions in /api, which verify the Supabase session and then
// forward to the n8n webhooks with the shared secret attached server-side
// (the secret never reaches the browser). Marking things as read is a
// local-only action, so it writes to Supabase directly.

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const params = new URLSearchParams(window.location.search);
const conversationId = params.get("id");

let session = null;
let conversation = null;

function renderMessages(messages) {
  const wrap = document.getElementById("messages-wrap");

  if (!messages.length) {
    wrap.innerHTML = `<div class="empty-state">No messages yet.</div>`;
    return;
  }

  wrap.innerHTML = messages
    .map(
      (m) => `
        <div class="msg ${escapeHtml(m.sender_type)}">
          ${escapeHtml(m.content)}
          <div class="msg-meta">${formatTime(m.created_at)}</div>
        </div>
      `
    )
    .join("");

  wrap.scrollTop = wrap.scrollHeight;
}

async function loadConversation() {
  const { data, error } = await supabaseClient
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (error || !data) {
    document.getElementById("conv-title").textContent = "Conversation not found";
    return;
  }

  conversation = data;
  document.getElementById("conv-title").textContent = data.customer_name || data.customer_phone || data.external_user_id;
  document.getElementById("mode-select").value = data.mode;
  document.getElementById("status-select").value = data.status;

  const channelLabel = { whatsapp: "WhatsApp", instagram: "Instagram" }[data.channel] || data.channel || "";
  document.getElementById("conv-channel-badge").innerHTML = channelLabel
    ? `<span class="badge channel-${escapeHtml(data.channel)}">${escapeHtml(channelLabel)}</span>`
    : "";
}

async function loadMessages() {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    document.getElementById("messages-wrap").innerHTML =
      `<div class="empty-state">Failed to load messages: ${escapeHtml(error.message)}</div>`;
    return;
  }

  renderMessages(data);
}

async function markRead() {
  await supabaseClient
    .from("conversations")
    .update({ unread_by_owner: false })
    .eq("id", conversationId);

  await supabaseClient
    .from("messages")
    .update({ read_by_owner: true })
    .eq("conversation_id", conversationId)
    .eq("read_by_owner", false);
}

async function callApi(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request to ${path} failed`);
  }

  return res.json().catch(() => ({}));
}

function wireControls() {
  document.getElementById("mode-select").addEventListener("change", async (e) => {
    const mode = e.target.value;
    try {
      await callApi("/api/set-mode", { conversationId, mode });
    } catch (err) {
      alert("Failed to change mode: " + err.message);
      e.target.value = conversation.mode;
    }
  });

  document.getElementById("status-select").addEventListener("change", async (e) => {
    const status = e.target.value;
    try {
      await callApi("/api/set-mode", { conversationId, mode: conversation.mode, status });
    } catch (err) {
      alert("Failed to change status: " + err.message);
      e.target.value = conversation.status;
    }
  });

  document.getElementById("send-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("message-input");
    const sendBtn = document.getElementById("send-btn");
    const message = input.value.trim();
    if (!message) return;

    sendBtn.disabled = true;
    try {
      await callApi("/api/send-message", { conversationId, message });
      input.value = "";
    } catch (err) {
      alert("Failed to send message: " + err.message);
    } finally {
      sendBtn.disabled = false;
    }
  });
}

function subscribeRealtime() {
  supabaseClient
    .channel(`conversation-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => {
        loadMessages();
        markRead();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "conversations",
        filter: `id=eq.${conversationId}`,
      },
      () => {
        loadConversation();
      }
    )
    .subscribe();
}

async function init() {
  if (!conversationId) {
    document.getElementById("conv-title").textContent = "Missing conversation id";
    return;
  }

  session = await requireSession();
  if (!session) return;

  await loadConversation();
  await loadMessages();
  await markRead();

  wireControls();
  subscribeRealtime();
}

init();
