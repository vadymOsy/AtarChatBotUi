// Conversation list: initial load + realtime updates. Message/customer
// content is user-supplied (it comes from WhatsApp), so it's always escaped
// before being placed in innerHTML.

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function formatTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function modeBadge(mode) {
  const label = { ai: "AI", human: "Human", paused: "Paused", closed: "Closed" }[mode] || mode;
  return `<span class="badge mode-${escapeHtml(mode)}">${escapeHtml(label)}</span>`;
}

function statusBadge(status) {
  const label = (status || "").replace(/_/g, " ");
  return `<span class="badge">${escapeHtml(label)}</span>`;
}

function intentBadge(orderIntentStatus) {
  if (orderIntentStatus !== "ORDER") return "";
  return `<span class="badge intent-order">Order intent</span>`;
}

function linkBadge(linkSent) {
  if (!linkSent) return "";
  return `<span class="badge">Link sent</span>`;
}

function channelBadge(channel) {
  const label = { whatsapp: "WhatsApp", instagram: "Instagram" }[channel] || channel;
  return `<span class="badge channel-${escapeHtml(channel || "")}">${escapeHtml(label)}</span>`;
}

function leadBadge(score, status) {
  if (score === null || score === undefined || !status) return "";
  const label = { cold: "Cold", warm: "Warm", hot: "Hot", ready_to_buy: "Ready to buy" }[status] || status;
  return `<span class="badge lead-${escapeHtml(status)}">${escapeHtml(label)} · ${escapeHtml(String(score))}</span>`;
}

function renderConversations(conversations) {
  const wrap = document.getElementById("list-wrap");

  if (!conversations.length) {
    wrap.innerHTML = `<div class="empty-state">No conversations yet.</div>`;
    return;
  }

  wrap.innerHTML = conversations
    .map((c) => {
      const name = c.customer_name || c.customer_phone;
      return `
        <a class="conv-card ${c.unread_by_owner ? "unread" : ""}" data-mode="${escapeHtml(c.mode || "")}" href="conversation.html?id=${encodeURIComponent(c.id)}">
          ${c.unread_by_owner ? '<span class="unread-dot"></span>' : ""}
          <div class="conv-card-top">
            <span class="conv-name">${escapeHtml(name)}</span>
            <span class="conv-time">${formatTime(c.last_message_at)}</span>
          </div>
          <div class="conv-preview">${escapeHtml(c.last_message_preview || "")}</div>
          <div class="badge-row">
            ${channelBadge(c.channel)}
            ${modeBadge(c.mode)}
            ${statusBadge(c.status)}
            ${intentBadge(c.order_intent_status)}
            ${linkBadge(c.link_sent)}
            ${leadBadge(c.lead_score, c.lead_status)}
          </div>
        </a>
      `;
    })
    .join("");
}

async function loadConversations(businessId) {
  const { data, error } = await supabaseClient
    .from("conversations")
    .select("*")
    .eq("business_id", businessId)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    document.getElementById("list-wrap").innerHTML =
      `<div class="empty-state">Failed to load conversations: ${escapeHtml(error.message)}</div>`;
    return;
  }

  renderConversations(data);
}

function renderBusinessContext(businesses, current) {
  document.getElementById("business-name").textContent = `— ${current.name}`;

  const switcher = document.getElementById("business-switcher");
  if (businesses.length > 1) {
    switcher.style.display = "";
    switcher.innerHTML = businesses
      .map((b) => `<option value="${escapeHtml(b.id)}" ${b.id === current.id ? "selected" : ""}>${escapeHtml(b.name)}</option>`)
      .join("");
    switcher.onchange = (e) => setCurrentBusiness(e.target.value);
  }
}

async function init() {
  const session = await requireSession();
  if (!session) return;

  const { businesses, current } = await resolveBusinessContext();
  if (!current) {
    document.getElementById("list-wrap").innerHTML =
      `<div class="empty-state">Your account isn't linked to a business yet. Contact your admin.</div>`;
    return;
  }
  renderBusinessContext(businesses, current);

  await loadConversations(current.id);

  // Realtime: any insert/update on conversations just re-pulls the full list
  // (simplest correct approach; the table is small enough that this is cheap).
  supabaseClient
    .channel("conversations-list")
    .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
      loadConversations(current.id);
    })
    .subscribe();
}

init();
