import { NextResponse, NextRequest } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: NextRequest) {
  const { env } = getRequestContext();
  const db = env.TALKTECH_DB;

  const h = request.headers;
  const hasCF = h.has('cf-access-jwt-assertion') ||
                h.has('cf-access-verified-email') ||
                h.has('cf-access-authenticated-user-email');
  const adminSecret = process.env.ADMIN_SECRET;
  const ok = hasCF || (!!adminSecret && h.get('x-admin-secret') === adminSecret);
  if (!ok) return noStore({ ok: false, error: 'Unauthorized' }, 401);

  try {
    const res = await db.prepare(
      'SELECT id, name, email, message, created_at, ip FROM contacts ORDER BY created_at DESC LIMIT 10'
    ).all();
    return noStore({ ok: true, rows: (res as any).results ?? res });
  } catch (err) {
    console.error('messages route error:', err);
    return noStore({ ok: false, error: 'Query failed' }, 500);
  }
}
