// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function GET() {
  try {
    // Safely obtain env; never throw if the adapter isn't ready
    let env: any = {}
    try {
      const ctx = getRequestContext() as any
      env = (ctx && ctx.env) ? ctx.env : {}
    } catch {
      env = {}
    }

    // Only check presence — do NOT touch DB/KV to avoid runtime errors
    const hasWorkerUrl =
      !!(env.CONTACT_WORKER_URL ?? process.env.CONTACT_WORKER_URL)
    const hasTurnstileSecret =
      !!(env.TURNSTILE_SECRET_KEY ??
         env.TURNSTILE_SECRET ??
         process.env.TURNSTILE_SECRET_KEY ??
         process.env.TURNSTILE_SECRET)
    const hasDbBinding = !!env.TALKTECH_DB
    const hasKvBinding = !!env.TALKTECH_KV
    const hasEmail = !!(env.RESEND_API_KEY ?? process.env.RESEND_API_KEY)

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          worker: hasWorkerUrl ? 'configured' : 'not configured',
          turnstile: hasTurnstileSecret ? 'configured' : 'not configured',
          database: hasDbBinding ? 'bound' : 'not configured',
          kv: hasKvBinding ? 'bound' : 'not configured',
          email: hasEmail ? 'configured' : 'not configured',
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    // Never emit a 500 — surface the error as JSON so we can act on it
    return NextResponse.json(
      { status: 'error', error: String(e?.message ?? e) },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
