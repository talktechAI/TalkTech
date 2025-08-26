import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|og.png).*)",
  ],
};

function securityHeaders(resp: NextResponse) {
  resp.headers.set("X-Content-Type-Options", "nosniff");
  resp.headers.set("X-Frame-Options", "DENY");
  resp.headers.set("Referrer-Policy", "no-referrer-when-downgrade");
  resp.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  resp.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  // CSP tuned for this app (allow CF analytics + Turnstile)
  const csp = [
    "default-src 'self'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "connect-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
    "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  resp.headers.set("Content-Security-Policy", csp);
  return resp;
}

// naive email regex; tightened further in API
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

// simple function to read JSON body safely
async function readJson(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { env } = getRequestContext();
  const url = new URL(req.url);
  const res = NextResponse.next();

  // Security headers on all responses
  securityHeaders(res);

  // Enforce Origin for POSTs to API endpoints (basic CSRF mitigation for cross-origin posts)
  if (req.method === "POST" && url.pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin") || "";
    const host = req.headers.get("host") || "";
    const allowed = env.NEXT_PUBLIC_SITE_ORIGIN || `https://${host}`;
    if (origin && !origin.startsWith(allowed)) {
      return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
    }
  }

  // Require Cloudflare Access on /admin/* (expect CF-Access headers)
  if (url.pathname.startsWith("/admin")) {
    const jwt = req.headers.get("cf-access-jwt-assertion");
    if (!jwt) {
      return NextResponse.json({ ok: false, error: "Access required" }, { status: 401 });
    }
  }

  // Rate limit /api/contact (per IP, sliding window). Prefer KV, fallback to D1.
  if (req.method === "POST" && url.pathname === "/api/contact") {
    const ip = req.headers.get("cf-connecting-ip") || req.ip || "0.0.0.0";
    const windowSecs = Number(env.RATE_LIMIT_WINDOW_SECS || "60");
    const maxReqs = Number(env.RATE_LIMIT_MAX || "5");
    const key = `rl:contact:${ip}`;

    // KV if bound
    const kv = env.TALKTECH_KV;
    if (kv && typeof kv.get === "function") {
      const val = await kv.get(key);
      const count = val ? parseInt(val, 10) : 0;
      if (count >= maxReqs) {
        return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
      }
      // Non-atomic; acceptable for simple throttling
      await kv.put(key, String(count + 1), { expirationTtl: windowSecs });
    } else {
      // D1 fallback
      const db = env.TALKTECH_DB;
      if (db) {
        await db.prepare(`CREATE TABLE IF NOT EXISTS rate_limits (
          key TEXT PRIMARY KEY,
          count INTEGER NOT NULL,
          expires INTEGER NOT NULL
        )`).run();
        const now = Math.floor(Date.now() / 1000);
        const expires = now + windowSecs;
        const row = await db.prepare("SELECT key, count, expires FROM rate_limits WHERE key=?1").bind(key).get();
        if (!row) {
          await db.prepare("INSERT INTO rate_limits (key, count, expires) VALUES (?1, ?2, ?3)").bind(key, 1, expires).run();
        } else {
          if (row.expires < now) {
            await db.prepare("UPDATE rate_limits SET count=?2, expires=?3 WHERE key=?1").bind(key, 1, expires).run();
          } else {
            if (row.count >= maxReqs) {
              return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
            }
            await db.prepare("UPDATE rate_limits SET count=count+1 WHERE key=?1").bind(key).run();
          }
        }
      }
      // If no KV/D1, skip (still protected by Turnstile)
    }

    // Optional: lightweight payload validation at the edge to fail fast
    const body = await readJson(req);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }
    const { name, email, message } = body;
    if (!name || !email || !message || !emailRe.test(String(email))) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }
  }

  return res;
}