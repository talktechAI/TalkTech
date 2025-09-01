import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import type { CloudflareEnv } from '@/utils/cloudflare-context';

// This route is protected by middleware.ts (requires CF Access headers)
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const context = getRequestContext();
const env = context?.env || {} as CloudflareEnv;
    
    if (!env.TALKTECH_DB) {
      return NextResponse.json(
        { ok: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Get total contacts count
    const totalResult = await env.TALKTECH_DB.prepare(
      'SELECT COUNT(*) as total FROM contacts'
    ).first() as { total: number } | null;

    // Get contacts from today
    const todayResult = await env.TALKTECH_DB.prepare(`
      SELECT COUNT(*) as today 
      FROM contacts 
      WHERE DATE(created_at) = DATE('now')
    `).first() as { today: number } | null;

    // Get contacts from this week
    const weekResult = await env.TALKTECH_DB.prepare(`
      SELECT COUNT(*) as week 
      FROM contacts 
      WHERE DATE(created_at) >= DATE('now', '-7 days')
    `).first() as { week: number } | null;

    // Get contacts from this month
    const monthResult = await env.TALKTECH_DB.prepare(`
      SELECT COUNT(*) as month 
      FROM contacts 
      WHERE DATE(created_at) >= DATE('now', 'start of month')
    `).first() as { month: number } | null;

    // Get recent contacts (last 5)
    const recentContacts = await env.TALKTECH_DB.prepare(`
      SELECT id, name, email, created_at, ip
      FROM contacts
      ORDER BY created_at DESC
      LIMIT 5
    `).all();

    // Get daily stats for the last 30 days
    const dailyStats = await env.TALKTECH_DB.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM contacts
      WHERE DATE(created_at) >= DATE('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all();

    // Get top domains from email addresses
    const topDomains = await env.TALKTECH_DB.prepare(`
      SELECT 
        SUBSTR(email, INSTR(email, '@') + 1) as domain,
        COUNT(*) as count
      FROM contacts
      GROUP BY domain
      ORDER BY count DESC
      LIMIT 5
    `).all();

    // Check rate limit status (KV)
    let rateLimitInfo = null;
    if (env.TALKTECH_KV) {
      try {
        // Get a sample of current rate limit keys
        const kvKeys = await env.TALKTECH_KV.list({ prefix: 'rl:contact:' });
        rateLimitInfo = {
          activeRateLimits: kvKeys.keys.length,
          lastCheck: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Rate limit check error:', error);
      }
    }

    return NextResponse.json({
      ok: true,
      stats: {
        total: totalResult?.total || 0,
        today: todayResult?.today || 0,
        week: weekResult?.week || 0,
        month: monthResult?.month || 0,
      },
      recentContacts: recentContacts.results || [],
      dailyStats: dailyStats.results || [],
      topDomains: topDomains.results || [],
      rateLimitInfo,
      lastUpdated: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
