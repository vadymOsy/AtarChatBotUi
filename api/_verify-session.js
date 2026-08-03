// Shared helpers for the API routes: confirm the bearer token the browser
// sent is a real, current Supabase session before we forward anything to
// n8n, and (multi-tenant) confirm that session's own user actually belongs
// to the business that owns a given conversation before acting on it.
//
// The access-token check reuses Supabase's own Row Level Security rather
// than re-implementing authorization here: querying with the *caller's*
// token (not a service-role key) means Postgres itself returns zero rows
// for a conversation outside the caller's business, exactly like the
// dashboard's own reads already behave.

async function verifySession(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { user: null, token: null };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
    },
  });

  if (!res.ok) {
    return { user: null, token: null };
  }

  const user = await res.json();
  return { user, token };
}

async function userOwnsConversation(token, conversationId) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/conversations?id=eq.${encodeURIComponent(conversationId)}&select=id`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
    }
  );

  if (!res.ok) {
    return false;
  }

  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = { verifySession, userOwnsConversation };
