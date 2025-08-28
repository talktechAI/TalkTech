import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

// Rate limiting and validation is already handled in middleware.ts

interface ContactRequest {
  name: string;
  email: string;
  message: string;
  turnstileToken?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const body: ContactRequest = await request.json();
    
    // Validate Cloudflare Turnstile token if configured
    if (env.TURNSTILE_SECRET_KEY && body.turnstileToken) {
      const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET,
          response: body.turnstileToken,
          remoteip: request.headers.get('cf-connecting-ip') || '',
        }),
      });
      
      const turnstileResult = await turnstileResponse.json();
      if (!turnstileResult.success) {
        return NextResponse.json(
          { ok: false, error: 'Captcha verification failed' },
          { status: 400 }
        );
      }
    }
    
    // Store in D1 database if configured
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
      
      await env.TALKTECH_DB.prepare(`
        INSERT INTO contacts (name, email, message, ip)
        VALUES (?, ?, ?, ?)
      `).bind(
        body.name,
        body.email,
        body.message,
        request.headers.get('cf-connecting-ip') || 'unknown'
      ).run();
    }
    
    // Send email notification if configured
    if (env.RESEND_API_KEY && env.NOTIFICATION_EMAIL) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@yourdomain.com',
          to: env.NOTIFICATION_EMAIL,
          subject: `New Contact Form Submission from ${body.name}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${body.name}</p>
            <p><strong>Email:</strong> ${body.email}</p>
            <p><strong>Message:</strong></p>
            <p>${body.message.replace(/\n/g, '<br>')}</p>
            <p><strong>IP:</strong> ${request.headers.get('cf-connecting-ip') || 'unknown'}</p>
          `,
        }),
      });
      
      if (!emailResponse.ok) {
        console.error('Failed to send notification email');
      }
    }
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Thank you for your message! I\'ll get back to you soon.' 
    });
    
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
