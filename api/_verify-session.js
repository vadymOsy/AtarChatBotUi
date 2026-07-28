// Shared helper for the two API routes below: confirms the bearer token the
// browser sent is a real, current Supabase session before we forward
// anything to n8n. Uses plain fetch against Supabase's auth REST endpoint —
// no SDK dependency needed for a one-off check like this.

async function verifySession(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return null;
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
    return null;
  }

  return res.json();
}

module.exports = { verifySession };
