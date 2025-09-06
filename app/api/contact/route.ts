// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

interface ContactRequest {
  name: string;
  email: string;
  message: string;
  turnstileToken?: string;
}

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const body: ContactRequest = await request.json();

    // (Optional) Validate Cloudflare Turnstile token if configured
    const turnstileSecret =
      env.TURNSTILE_SECRET_KEY || env.TURNSTILE_SECRET || '';

    if (turnstileSecret && body.turnstileToken) {
      const verify = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: turnstileSecret,
            response: body.turnstileToken,
            remoteip: request.headers.get('cf-connecting-ip') || '',
          }),
        }
      );
      const result = await verify.json();
      if (!result?.success) {
        return noStore({ ok: false, error: 'Captcha verification failed' }, 400);
      }
    }

    // Store in D1 database if configured
    if (env.TALKTECH_DB) {
      await env.TALKTECH_DB
        .prepare(`
          CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip TEXT
          )
        `)
        .run();

      await env.TALKTECH_DB
        .prepare(
          `
          INSERT INTO contacts (name, email, message, ip)
          VALUES (?, ?, ?, ?)
        `
        )
        .bind(
          body.name,
          body.email,
          body.message,
          request.headers.get('cf-connecting-ip') || 'unknown'
        )
        .run();
    }

    // Send email notification if configured (no secrets in response)
    if (env.RESEND_API_KEY && env.NOTIFICATION_EMAIL) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'noreply@talktech.io',
            to: env.NOTIFICATION_EMAIL,
            subject: `New Contact Form Submission from ${body.name}`,
            html: `
              <h2>New Contact Form Submission</h2>
              <p><strong>Name:</strong> ${body.name}</p>
              <p><strong>Email:</strong> ${body.email}</p>
              <p><strong>Message:</strong></p>
              <p>${(body.message || '').replace(/\n/g, '<br>')}</p>
              <p><strong>IP:</strong> ${
                request.headers.get('cf-connecting-ip') || 'unknown'
              }</p>
            `,
          }),
        });
        if (!emailRes.ok) {
          console.error('Failed to send notification email');
        }
      } catch (e) {
        console.error('Email send error:', e);
      }
    }

    return noStore({
      ok: true,
      message: "Thank you for your message! I'll get back to you soon.",
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return noStore({ ok: false, error: 'Internal server error' }, 500);
  }
}

// OPTIONS (CORS preflight if needed)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  });
}
