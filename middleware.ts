import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

async function readJson(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// Safe function to get Cloudflare context
function getCloudflareContext() {
  try {
    // Only import and use on Cloudflare runtime
    if (typeof globalThis.process === 'undefined') {
      const { getRequestContext } = require("@cloudflare/next-on-pages");
      const context = getRequestContext();
      return context?.env || null;
    }
  } catch (e) {
    // Not in Cloudflare environment
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const env = getCloudflareContext();
  const url = new URL(req.url);
  const res = NextResponse.next();

  // Security headers on all responses
  securityHeaders(res);

  // Skip Cloudflare-specific features if not on Cloudflare
  if (!env) {
    // Basic security only, no rate limiting or Access checks
    return res;
  }

  // Enforce Origin for POSTs to API endpoints (basic CSRF mitigation)
  if (req.method === "POST" && url.pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin") || "";
    const host = req.headers.get("host") || "";
    const allowedOrigins = [env.SITE_ORIGIN, env.ALT_SITE_ORIGIN, `https://${host}`].filter(Boolean);
    if (origin && !allowedOrigins.some(a => origin.startsWith(a as string))) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid origin" }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(res.headers.entries())
        }
      });
    }
  }

  // Require Cloudflare Access on /admin/* (expect CF-Access headers)
  if (url.pathname.startsWith("/admin")) {
    const jwt = req.headers.get("cf-access-jwt-assertion");
    if (!jwt) {
      return new Response(JSON.stringify({ ok: false, error: "Access required" }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(res.headers.entries())
        }
      });
    }
  }

  // Rate limit /api/contact (per IP, sliding window)
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
        
        // Clean up expired entries periodically (1% chance)
        if (Math.random() < 0.01) {
          await db.prepare("DELETE FROM rate_limits WHERE expires < ?1")
            .bind(now)
            .run();
        }
        
        const result = await db.prepare(`
          INSERT INTO rate_limits (key, count, expires) 
          VALUES (?1, 1, ?2)
          ON CONFLICT(key) DO UPDATE SET 
            count = CASE 
              WHEN expires < ?3 THEN 1 
              ELSE count + 1 
            END,
            expires = CASE 
              WHEN expires < ?3 THEN ?2 
              ELSE expires 
            END
          RETURNING count
        `).bind(key, now + windowSecs, now).first() as { count: number } | null;
        
        if (result && result.count > maxReqs) {
          return new Response(JSON.stringify({ ok: false, error: "Rate limit exceeded" }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // Optional: lightweight payload validation at the edge
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