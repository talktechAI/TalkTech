// app/api/admin/contacts/route.ts
export const runtime = 'edge';       // required when using getRequestContext (Cloudflare Edge)
export const prerender = false;      // never SSG an API route

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

// This route is protected by middleware.ts (requires CF Access headers)

export async function GET(request: NextRequest) {
  try {
    // ✅ type the env so TS knows your bindings/secrets
    const { env } = getRequestContext() as { env: CloudflareEnv };
    const { searchParams } = new URL(request.url);

    // ✅ sanitize inputs with sensible bounds
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1') || 1);
    const limitRaw = Number.parseInt(searchParams.get('limit') ?? '10') || 10;
    const limit = Math.min(Math.max(1, limitRaw), 100); // 1..100
    const offset = (page - 1) * limit;

    if (!env.TALKTECH_DB) {
      return NextResponse.json(
        { ok: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Get total count
    const countResult = await env.TALKTECH_DB
      .prepare('SELECT COUNT(*) as total FROM contacts')
      .first() as { total: number } | null;

    const total = countResult?.total ?? 0;

    // Get paginated contacts
    const contacts = await env.TALKTECH_DB.prepare(`
      SELECT id, name, email, message, created_at, ip
      FROM contacts
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    return NextResponse.json(
      {
        ok: true,
        data: contacts.results ?? [],
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } } // ✅ avoid caching admin responses
    );

  } catch (error) {
    console.error('Admin contacts error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

// Delete a contact (optional)
export async function DELETE(request: NextRequest) {
  try {
    // ✅ typed env here too
    const { env } = getRequestContext() as { env: CloudflareEnv };
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!env.TALKTECH_DB) {
      return NextResponse.json(
        { ok: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'ID required' },
        { status: 400 }
      );
    }

    await env.TALKTECH_DB
      .prepare('DELETE FROM contacts WHERE id = ?')
      .bind(id)
      .run();

    return NextResponse.json({ ok: true, message: 'Contact deleted' });

  } catch (error) {
    console.error('Admin delete error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
