// app/api/contact/route.ts
export const runtime = 'edge';
export const prerender = false;

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

// Rate limiting and validation is already handled in middleware.ts

interface ContactRequest {
  name: string;
  email: string;
  message: string;
  turnstileToken?: string;
}

// Simple HTML escape to avoid injection in the email body
function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const MAX_NAME_LEN = 200;
const MAX_EMAIL_LEN = 320;
const MAX_MESSAGE_LEN = 5000;

export async function POST(request: NextRequest) {
  try {
    // ✅ typed env
    const { env } = getRequestContext() as { env: CloudflareEnv };

    // Parse and basic validation (defense-in-depth; middleware already validates)
    let body: ContactRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const name = (body.name ?? '').trim().slice(0, MAX_NAME_LEN);
    const email = (body.email ?? '').trim().slice(0, MAX_EMAIL_LEN);
    const message = (body.message ?? '').trim().slice(0, MAX_MESSAGE_LEN);

    if (!name || !email || !message) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 422 });
    }

    // Lightweight email format check
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 422 });
    }

    const clientIp = request.headers.get('cf-connecting-ip') || '';

    // ✅ Turnstile (supports either env var name)
    const TURNSTILE_SECRET = env.TURNSTILE_SECRET_KEY ?? env.TURNSTILE_SECRET;
    if (TURNSTILE_SECRET && body.turnstileToken) {
      const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: TURNSTILE_SECRET,
          response: body.turnstileToken,
          remoteip: clientIp,
        }),
      });

      const res = await r.json();
      if (!res?.success) {
        return NextResponse.json({ ok: false, error: 'Captcha verification failed' }, { status: 400 });
      }
    }

    // ✅ Store in D1 (if bound)
    if (env.TALKTECH_DB) {
      await env.TALKTECH_DB.prepare(`
        CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          ip TEXT
        )
      `).run();

      await env.TALKTECH_DB.prepare(
        `INSERT INTO contacts (name, email, message, ip) VALUES (?, ?, ?, ?)`
      ).bind(name, email, message, clientIp || 'unknown').run();
    }

    // ✅ Notification email (if configured)
    if (env.RESEND_API_KEY && env.NOTIFICATION_EMAIL) {
      // escape user content for HTML body
      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
      const safeIp = escapeHtml(clientIp || 'unknown');

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Talk Tech <noreply@talktech.io>', // ensure domain is verified in Resend
          to: env.NOTIFICATION_EMAIL,
          subject: `New Contact Form Submission from ${safeName}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${safeName}</p>
            <p><strong>Email:</strong> ${safeEmail}</p>
            <p><strong>Message:</strong></p>
            <p>${safeMessage}</p>
            <p><strong>IP:</strong> ${safeIp}</p>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send notification email');
      }
    }

    return NextResponse.json(
      { ok: true, message: "Thank you for your message! I'll get back to you soon." },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
