
# TalkTech on Cloudflare Pages (Next.js + next-on-pages)

## 1) Install
```bash
npm i
```

## 2) Local dev (with Cloudflare dev platform)
```bash
npm run dev
```
> If you see errors about D1/KV, that's normal locally. The app guards those paths.

## 3) Required Cloudflare setup
- **Project**: Cloudflare Pages → connect your GitHub repo.
- **Compatibility flag**: `nodejs_compat` (Pages → Settings → Functions → Compatibility Flags).
- **Environment variables (Pages → Settings → Environment Variables)**:
  - `SITE_ORIGIN`: `https://talktech.pages.dev` (or your custom domain)
  - `RATE_LIMIT_WINDOW_SECS`: `60`
  - `RATE_LIMIT_MAX`: `5`
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: *(from Cloudflare Turnstile)*
  - `NEXT_PUBLIC_CF_BEACON_TOKEN`: *(optional Cloudflare Analytics)*
- **Secrets (Wrangler CLI)**:
```bash
wrangler secret put TURNSTILE_SECRET_KEY --env production
wrangler secret put CF_CONTACT_WEBHOOK --env production   # optional
wrangler secret put RESEND_API_KEY --env production       # optional
wrangler secret put NOTIFICATION_EMAIL --env production   # optional
```

## 4) D1 Database
```bash
wrangler d1 create talktech-db
# copy the database_id into wrangler.toml under both envs
```
Tables are created automatically on first use (`contacts`, `rate_limits`).

## 5) Build & Deploy
- **Pages (CI)**: Cloudflare will run `npx @cloudflare/next-on-pages` automatically via `pages:deploy` script.
- **Manual**:
```bash
npm run build
npx @cloudflare/next-on-pages
npx wrangler pages deploy .vercel/output/static
```
