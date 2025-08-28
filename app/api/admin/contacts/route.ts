import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

// This route is protected by middleware.ts (requires CF Access headers)

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const { searchParams } = new URL(request.url);
    
    if (!env.TALKTECH_DB) {
      return NextResponse.json(
        { ok: false, error: 'Database not configured' },
        { status: 500 }
      );
    }
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Get total count
    const countResult = await env.TALKTECH_DB.prepare(
      'SELECT COUNT(*) as total FROM contacts'
    ).first() as { total: number } | null;
    
    const total = countResult?.total || 0;
    
    // Get paginated contacts
    const contacts = await env.TALKTECH_DB.prepare(`
      SELECT id, name, email, message, created_at, ip
      FROM contacts
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
    
    return NextResponse.json({
      ok: true,
      data: contacts.results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
    
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
    const { env } = getRequestContext();
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
    
    await env.TALKTECH_DB.prepare('DELETE FROM contacts WHERE id = ?').bind(id).run();
    
    return NextResponse.json({ ok: true, message: 'Contact deleted' });
    
  } catch (error) {
    console.error('Admin delete error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
