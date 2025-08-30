// app/api/health/route.ts
export const runtime = 'edge';
export const prerender = false;

import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET() {
  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };

    // --- D1 status ---
    let dbStatus: 'not configured' | 'connected' | 'error' = 'not configured';
    if (env.TALKTECH_DB) {
      try {
        await env.TALKTECH_DB.prepare('SELECT 1').first();
        dbStatus = 'connected';
      } catch (error) {
        dbStatus = 'error';
        console.error('Database connection error:', error);
      }
    }

    // --- KV status ---
    let kvStatus: 'not configured' | 'connected' | 'error' = 'not configured';
    if (env.TALKTECH_KV) {
      try {
        await env.TALKTECH_KV.get('health-check');
        kvStatus = 'connected';
      } catch (error) {
        kvStatus = 'error';
        console.error('KV connection error:', error);
      }
    }

    // Normalize Turnstile key and check email config
    const turnstileConfigured = !!(env.TURNSTILE_SECRET_KEY ?? (env as any).TURNSTILE_SECRET);
    const emailConfigured = !!env.RESEND_API_KEY;

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        runtime: 'edge',
        services: {
          database: dbStatus,
          kv: kvStatus,
          turnstile: turnstileConfigured ? 'configured' : 'not configured',
          email: emailConfigured ? 'configured' : 'not configured',
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Health check failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
