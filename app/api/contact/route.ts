// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

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

    // ---- 1) Validate input early
    if (!body?.name || !body?.email || !body?.message) {
      return noStore({ ok: false, error: 'Missing fields' }, 400);
    }

    // ---- 2) (Optional) Validate Cloudflare Turnstile token if configured
    const turnstileSecret =
      env.TURNSTILE_SECRET_KEY || env.TURNSTILE_SECRET || '';

    if (turnstileSecret) {
      const token = body.turnstileToken || '';
      if (!token) {
        return noStore({ ok: false, error: 'Captcha required' }, 400);
      }

      const verify = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: turnstileSecret,
            response: token,
            remoteip: request.headers.get('cf-connecting-ip') || '',
          }),
        }
      );
      const result = await verify.json();
      if (!result?.success) {
        return noStore({ ok: false, error: 'Captcha verification failed' }, 400);
      }
    }

    // ---- 3) Proxy to the Worker (single source of truth for DB writes)
    const workerUrl = env.CONTACT_WORKER_URL;
    const workerSecret = env.WEBHOOK_SECRET;

    if (!workerUrl || !workerSecret) {
      console.error('Worker URL or WEBHOOK_SECRET missing in environment');
      return noStore({ ok: false, error: 'Server misconfiguration' }, 500);
    }

    // Forward client IP to the Worker (it also has CF-Connecting-IP at edge)
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';

    const workerRes = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': workerSecret,                 // auth for Worker
        'X-Forwarded-For': ip,                       // extra signal
        // (Optional) propagate a request ID / user agent if you want:
        'X-Client-UA': request.headers.get('user-agent') || '',
      },
      body: JSON.stringify({
        name: body.name,
        email: body.email,
        message: body.message,
        // If you want the Worker to also verify Turnstile, you can pass token:
        // turnstileToken: body.turnstileToken,
      }),
    });

    const workerText = await workerRes.text();

    // Bubble up Worker errors transparently
    if (!workerRes.ok) {
      // Log the worker body for debugging; do not expose internal data to client
      console.error('Worker error:', workerRes.status, workerText);
      return noStore(
        { ok: false, error: 'Failed to save message' },
        workerRes.status
      );
    }

    // Optional: parse Worker JSON for an id (if it returns one)
    let workerJson: any = {};
    try {
      workerJson = JSON.parse(workerText);
    } catch {
      // if Worker returns plain text, still proceed
    }

    // ---- 4) Send email notification (only after successful Worker insert)
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
              <p><strong>IP:</strong> ${ip}</p>
              ${
                workerJson?.id
                  ? `<p><strong>Record ID:</strong> ${workerJson.id}</p>`
                  : ''
              }
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

    // ---- 5) Final response to client
    return noStore({
      ok: true,
      message: "Thank you for your message! I'll get back to you soon.",
      ...(workerJson && typeof workerJson === 'object' ? { worker: workerJson } : {}),
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
