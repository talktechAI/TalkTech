import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

type TurnstileVerify = {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

export async function POST(req: Request) {
  const { env } = getRequestContext();
  try {
    // --- Parse & normalize body ---
    const data = await req.json().catch(() => ({}));
    let { name, email, message, turnstileToken } = (data || {}) as {
      name?: string;
      email?: string;
      message?: string;
      turnstileToken?: string;
    };
    name = String(name || "").trim();
    email = String(email || "").trim();
    message = String(message || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
    }
    if (name.length > 120 || email.length > 200 || message.length > 5000) {
      return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 });
    }

    // --- Turnstile verification ---
    const secret = (env as any).TURNSTILE_SECRET_KEY as string | undefined;
    if (!secret) {
      return NextResponse.json({ ok: false, error: "Server misconfigured: TURNSTILE_SECRET_KEY missing." }, { status: 500 });
    }
    if (!turnstileToken) {
      return NextResponse.json({ ok: false, error: "CAPTCHA token missing." }, { status: 400 });
    }

    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "";
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", turnstileToken);
    if (ip) form.set("remoteip", ip);

    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    const verifyJson = (await verifyRes.json()) as TurnstileVerify;
    if (!verifyJson.success) {
      return NextResponse.json(
        { ok: false, error: "CAPTCHA failed", details: verifyJson["error-codes"] || [] },
        { status: 400 }
      );
    }

    const payload = {
      name,
      email,
      message,
      userAgent: req.headers.get("user-agent") || "",
      created_at: new Date().toISOString(),
    };

    // --- Optional: forward to webhook if configured ---
    const webhook = (env as any).CF_CONTACT_WEBHOOK as string | undefined;
    if (webhook) {
      await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }

    // --- Store in D1 if bound ---
    const db = (env as any).TALKTECH_DB;
    if (db) {
      await db
        .prepare(`CREATE TABLE IF NOT EXISTS contact_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          message TEXT NOT NULL,
          ua TEXT,
          created_at TEXT NOT NULL
        )`)
        .run();

      await db
        .prepare(
          "INSERT INTO contact_messages (name, email, message, ua, created_at) VALUES (?1, ?2, ?3, ?4, ?5)"
        )
        .bind(name, email, message, payload.userAgent, payload.created_at)
        .run();
    }

    return NextResponse.json({ ok: true, received: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
