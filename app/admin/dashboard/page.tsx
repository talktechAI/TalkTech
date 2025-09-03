// app/admin/dashboard/page.tsx
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { headers } from 'next/headers';
import DashboardClient from './DashboardClient';

type Stats = {
  total: number;
  today: number;
  week: number;
  month: number;
};

export default async function DashboardPage() {
  const h = headers();
  const host = h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const origin = `${proto}://${host}`;
  const user = h.get('cf-access-authenticated-user-email') || 'Unknown user';

  // Fetch admin stats (server-side, no secrets in response)
  let stats: Stats | null = null;
  try {
    const res = await fetch(`${origin}/api/admin/stats`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (res.ok) {
      const json = await res.json();
      stats = json?.stats ?? null;
    }
  } catch {
    // swallow — client shows placeholders
  }

  // Fetch recent contacts (first page)
  let contacts: any[] = [];
  try {
    const res = await fetch(`${origin}/api/admin/contacts?page=1&limit=10`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (res.ok) {
      const json = await res.json();
      contacts = Array.isArray(json?.data) ? json.data : [];
    }
  } catch {
    // swallow — client shows placeholders
  }

  // Only pass serializable, non-secret values to the client
  return <DashboardClient initial={{ user, stats, contacts }} />;
}
