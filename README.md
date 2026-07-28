# Atar Owner Dashboard

Plain HTML/CSS/JS — no build step. Two tiny Vercel serverless functions in
`/api` exist only to keep the n8n webhook secret off the browser; everything
else is static and talks to Supabase directly.

## 1. Supabase setup

1. Run `n8n/migrations/001_conversations_and_messages.sql` in the Supabase
   SQL editor if you haven't already (creates `conversations` + `messages`,
   enables Realtime and RLS).
2. In **Authentication → Users**, manually add the owner's account (email +
   password). There's no public sign-up page by design — this is a
   single-tenant internal tool.
3. In **Settings → API**, copy the Project URL and the `anon` public key into
   `js/supabase-config.js` (`SUPABASE_URL` / `SUPABASE_ANON_KEY`). These are
   meant to be public — access is enforced by Row Level Security, not by
   hiding this key.

## 2. Vercel environment variables (for the `/api` functions only)

Set these in the Vercel project settings — never commit them:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | same as above |
| `SUPABASE_ANON_KEY` | same as above |
| `N8N_BASE_URL` | e.g. `https://atarweb.app.n8n.cloud` |
| `N8N_WEBHOOK_HEADER_NAME` | the header name you configured for n8n's "Atar KB Webhook Auth" credential (e.g. `Authorization` or a custom header) |
| `N8N_WEBHOOK_HEADER_VALUE` | that credential's secret value |

The two new n8n webhooks (`owner-send-message`, `set-conversation-mode`)
reuse that same credential, so these are the same values already configured
there.

## 3. Deploy

```bash
npx vercel
```

or connect this folder as a Git repo and import it in the Vercel dashboard.
No build command needed — it's static files + `/api`.

## 4. Local testing

Since `/api` needs a server, plain `open index.html` won't exercise send/mode
changes (Supabase reads and Realtime will still work fine though). To test
everything locally:

```bash
npx vercel dev
```

This needs Node.js installed; it runs the same static+serverless setup
Vercel uses in production, reading a local `.env` file for the variables
above.

## Structure

- `login.html`, `index.html` (conversation list), `conversation.html?id=...`
  (single conversation) — all client-rendered, guarded by
  `js/auth.js`'s session check (the real security boundary is Supabase RLS
  + the API functions verifying the session token, not this redirect).
- `js/dashboard.js` — conversation list + realtime subscription.
- `js/conversation.js` — message history, realtime subscription, mark-read,
  and the send/mode-change calls to `/api`.
- `api/send-message.js`, `api/set-mode.js` — verify the caller's Supabase
  session, then forward to the matching n8n webhook with the secret header
  attached server-side.
