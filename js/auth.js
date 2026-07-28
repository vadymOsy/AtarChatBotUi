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
