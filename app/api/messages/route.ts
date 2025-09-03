import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function GET() {
  const { env } = getRequestContext();
  const db = env.TALKTECH_DB;

  if (!db) {
    return noStore({ ok: false, error: 'D1 binding TALKTECH_DB is not configured.' }, 500);
  }

  // Try legacy table first; fall back to contacts
  try {
    const res = await db
      .prepare(
        'SELECT id, name, email, message, created_at FROM contact_messages ORDER BY id DESC LIMIT 10'
      )
      .all();
    return noStore({ ok: true, rows: (res as any).results ?? res });
  } catch {
    try {
      const res = await db
        .prepare(
          'SELECT id, name, email, message, created_at, ip FROM contacts ORDER BY created_at DESC LIMIT 10'
        )
        .all();
      return noStore({ ok: true, rows: (res as any).results ?? res });
    } catch (err) {
      console.error('messages route error:', err);
      return noStore({ ok: false, error: 'Query failed' }, 500);
    }
  }
}
