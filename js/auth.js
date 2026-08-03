// Shared auth helpers. Real data access is protected by Supabase Row Level
// Security (only `authenticated` users can read/write conversations and
// messages) and by the serverless functions verifying the session token
// before proxying to n8n — these redirects are just UX, not the security
// boundary.

async function requireSession() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return null;
  }

  return session;
}

async function redirectIfLoggedIn() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session) {
    window.location.href = "index.html";
  }
}

async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

// Multi-tenant: resolves which business (or businesses) the logged-in user
// belongs to. Most users belong to exactly one - that becomes the active
// workspace transparently. A user with more than one gets a small switcher
// (see dashboard.js/conversation.js) stored in sessionStorage per tab.
async function resolveBusinessContext() {
  const { data, error } = await supabaseClient
    .from("business_members")
    .select("business_id, role, businesses(name)")
    .order("created_at", { ascending: true });

  if (error || !data || !data.length) {
    return { businesses: [], current: null };
  }

  const businesses = data.map((row) => ({
    id: row.business_id,
    name: row.businesses?.name || "Business",
    role: row.role,
  }));

  const storedId = sessionStorage.getItem("currentBusinessId");
  const current = businesses.find((b) => b.id === storedId) || businesses[0];
  sessionStorage.setItem("currentBusinessId", current.id);

  return { businesses, current };
}

function setCurrentBusiness(businessId) {
  sessionStorage.setItem("currentBusinessId", businessId);
  window.location.reload();
}
