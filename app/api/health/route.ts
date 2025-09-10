// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET() {
  const { env } = getRequestContext();

  // DB check (optional but safe)
  let dbStatus: 'connected' | 'error' | 'not configured' = 'not configured';
  if (env.TALKTECH_DB) {
    try {
      await env.TALKTECH_DB.prepare('SELECT 1').first();
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }
  }

  // KV check (optional but safe)
  let kvStatus: 'connected' | 'error' | 'not configured' = 'not configured';
  if (env.TALKTECH_KV) {
    try {
      await env.TALKTECH_KV.get('health-check');
      kvStatus = 'connected';
    } catch {
      kvStatus = 'error';
    }
  }

  const turnstileConfigured = !!(env.TURNSTILE_SECRET_KEY || env.TURNSTILE_SECRET);
  const emailConfigured = !!env.RESEND_API_KEY;
  const workerConfigured = !!env.CONTACT_WORKER_URL;

  services: {
    database: dbStatus,
    kv: kvStatus,
    turnstile: turnstileConfigured ? 'configured' : 'not configured',
    email: emailConfigured ? 'configured' : 'not configured',
    worker: workerConfigured ? 'configured' : 'not configured',
  },

  
  // Never return actual secrets
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        kv: kvStatus,
        turnstile: turnstileConfigured ? 'configured' : 'not configured',
        email: emailConfigured ? 'configured' : 'not configured',
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
