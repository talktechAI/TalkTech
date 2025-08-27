# TalkTech — Next.js on Cloudflare Pages (Next-on-Pages)

## Development

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your values
3. `npm run dev` for local development

## Deployment on Cloudflare Pages

Deploy via Cloudflare Dashboard:
- Build command: `npx @cloudflare/next-on-pages@latest`
- Build output directory: `.vercel/output/static`
- Node.js compatibility: Enable in Settings → Functions → Compatibility flags → `nodejs_compat`

## Security & Data

### Turnstile CAPTCHA
- Add env vars in Cloudflare Pages → *Settings → Environment variables*:
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (client)
  - `TURNSTILE_SECRET_KEY` (server)
- The contact form includes a Turnstile widget and server-side verification.

### D1 Database (optional but recommended)
- Create a D1 DB in Cloudflare Dashboard.
- In your Pages project → **Functions** → **D1 bindings**:
  - Add binding name: `TALKTECH_DB`
  - Select your D1 database
- The API will automatically create the table `contact_messages` if it doesn't exist:
  ```sql
  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    ua TEXT,
    created_at TEXT NOT NULL
  );
  ```
- Test endpoint: `/api/messages` returns last 10 rows.

### Cloudflare Web Analytics
- In Pages → **Web Analytics** get a token and set env var:
  - `NEXT_PUBLIC_CF_BEACON_TOKEN=your-token`
- The beacon is injected via `<Script>` in `app/layout.tsx`.

## Security Hardening Checklist

- **CAPTCHA**: Turnstile (Managed) enabled on `/contact`.
- **Rate limiting**: Configure either **KV** or **D1**:
  - KV: create a KV namespace, bind it as `TALKTECH_KV`.
  - D1: already supported via `TALKTECH_DB` fallback.
  - Optional env knobs: `RATE_LIMIT_WINDOW_SECS` (default 60), `RATE_LIMIT_MAX` (default 5).
- **Origin enforcement**: Set `NEXT_PUBLIC_SITE_ORIGIN` (e.g., `https://www.talktech.com`) to lock POSTs to your domain.
- **Security headers**: Added via `middleware.ts` (HSTS, CSP, XFO, etc.). Tune CSP if you add new CDNs.
- **WAF/Bot settings (Cloudflare Dashboard)**:
  - Enable **Bot Fight Mode** (or Bot Management if on paid plans).
  - Add **WAF rules**: block high threat scores, geoblock if appropriate, throttle paths like `/api/contact`.
  - Limit methods/paths where possible.
- **Admin access**: Protect any future `/admin/*` pages with **Cloudflare Access** (SSO) or Turnstile-gated login.

## Admin Dashboard (Cloudflare Access protected)

**Path:** `/admin/messages`

### Recommended protection (safest)
Use **Cloudflare Access** (Zero Trust) to require SSO before any `/admin/*` request ever reaches your app.

**Setup:**
1. Cloudflare Dashboard → **Access** → **Applications** → **Add an application** → **Self-hosted**.
2. **Application domain/path:** your-domain.com/**admin/***
3. **Policies:** Include your team email domain (e.g., *@yourcompany.com) or specific addresses.
4. (Optional) **Inject identity headers** is on by default; the app reads:
   - `CF-Access-Authenticated-User-Email`
   - `CF-Access-Authenticated-User-Sub`
5. Save.

**How the app enforces it:**
- Cloudflare Access sits in front and blocks unauthenticated requests.
- As a defense-in-depth measure, `middleware.ts` returns **401** for `/admin/*` if the `cf-access-jwt-assertion` header is missing.
- The admin page displays the signed-in email from `CF-Access-Authenticated-User-Email`.

> Note: The real enforcement is done by Cloudflare Access itself. The header check is just an extra guard.
