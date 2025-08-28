import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET() {
  try {
    const { env } = getRequestContext();
    
    // Test database connectivity if configured
    let dbStatus = 'not configured';
    if (env.TALKTECH_DB) {
      try {
        await env.TALKTECH_DB.prepare('SELECT 1').first();
        dbStatus = 'connected';
      } catch (error) {
        dbStatus = 'error';
        console.error('Database connection error:', error);
      }
    }
    
    // Test KV connectivity if configured
    let kvStatus = 'not configured';
    if (env.TALKTECH_KV) {
      try {
        await env.TALKTECH_KV.get('health-check');
        kvStatus = 'connected';
      } catch (error) {
        kvStatus = 'error';
        console.error('KV connection error:', error);
      }
    }
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      services: {
        database: dbStatus,
        kv: kvStatus,
        turnstile: env.TURNSTILE_SECRET ? 'configured' : 'not configured',
        email: env.RESEND_API_KEY ? 'configured' : 'not configured',
      }
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: 'Health check failed' },
      { status: 500 }
    );
  }
}
