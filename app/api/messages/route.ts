// app/api/admin/messages/route.ts
export const runtime = 'edge';
export const prerender = false;

import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET() {
  try {
    const { env } = getRequestContext() as { env: CloudflareEnv };
    const db = env.TALKTECH_DB;

    if (!db) {
      return NextResponse.json(
        { ok: false, error: 'D1 binding TALKTECH_DB is not configured.' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const res = await db
      .prepare(
        'SELECT id, name, email, message, created_at FROM contact_messages ORDER BY id DESC LIMIT 10'
      )
      .all();

    return NextResponse.json(
      { ok: true, rows: res.results ?? [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Admin messages error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch messages' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
