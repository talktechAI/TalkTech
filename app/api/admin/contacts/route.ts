// app/api/admin/contacts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import type { CloudflareEnv } from '@/utils/cloudflare-context';
// This route is protected by middleware.ts (requires CF Access headers)

export const runtime = 'edge'; // required for getRequestContext on Cloudflare

type CountRow = { total: number };

export async function GET(request: NextRequest) {
  try {
    const context = getRequestContext();
const env = context?.env || {} as CloudflareEnv;
    const { searchParams } = new URL(request.url);

    if (!env.TALKTECH_DB) {
      return NextResponse.json(
        { ok: false, error: 'Database not configured' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    // Total count (NOTE: cast result AFTER the call, don't use generics on .first())
    const countRow = (await env.TALKTECH_DB
      .prepare('SELECT COUNT(*) as total FROM contacts')
      .first()) as CountRow | null;

    const total = countRow?.total ?? 0;

    // Paginated contacts
    const contactsRes = await env.TALKTECH_DB
      .prepare(
        `
        SELECT id, name, email, message, created_at, ip
        FROM contacts
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .bind(limit, offset)
      .all();

    return NextResponse.json(
      {
        ok: true,
        data: contactsRes.results,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Admin contacts error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch contacts' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!env.TALKTECH_DB) {
      return NextResponse.json(
        { ok: false, error: 'Database not configured' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'ID required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    await env.TALKTECH_DB.prepare('DELETE FROM contacts WHERE id = ?').bind(id).run();

    return NextResponse.json(
      { ok: true, message: 'Contact deleted' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Admin delete error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete contact' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
