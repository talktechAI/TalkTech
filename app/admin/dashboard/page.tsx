'use client';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { headers } from "next/headers";
import { Suspense } from 'react';

export const runtime = 'edge';

// Keep your existing getRows function but enhance it
async function getRows(limit = 50) {
  const h = headers();
  const host = h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  const origin = `${proto}://${host}`;
  const res = await fetch(`${origin}/api/messages?limit=${limit}`, { 
    cache: "no-store", 
    headers: { "accept": "application/json" } 
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.rows || json.results || [];
}

// New function to get stats
async function getStats() {
  const h = headers();
  const host = h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  const origin = `${proto}://${host}`;
  
  try {
    const res = await fetch(`${origin}/api/admin/stats`, { 
      cache: "no-store", 
      headers: { "accept": "application/json" } 
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.ok ? json : null;
  } catch {
    return null;
  }
}

// Stats component
async function StatsCards() {
  const stats = await getStats();
  
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Messages</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">-</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Messages</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.stats?.total || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Today</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.stats?.today || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">This Week</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.stats?.week || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center">
          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
            <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">This Month</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.stats?.month || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced message table with better formatting
function MessageTable({ rows }: { rows: any[] }) {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const truncateMessage = (msg: string, length = 100) => {
    return msg.length > length ? msg.substring(0, length) + "..." : msg;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Messages</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Latest {rows.length} contact form submissions
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300">
            <tr>
              <th className="px-6 py-3 text-left font-medium">ID</th>
              <th className="px-6 py-3 text-left font-medium">Contact</th>
              <th className="px-6 py-3 text-left font-medium">Message Preview</th>
              <th className="px-6 py-3 text-left font-medium">Received</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg font-medium">No messages yet</p>
                    <p className="text-sm">Contact form submissions will appear here</p>
                  </div>
                </td>
              </tr>
            )}
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                  #{r.id}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <div className="font-medium text-slate-900 dark:text-white">{r.name}</div>
                    <a 
                      href={`mailto:${r.email}`} 
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    >
                      {r.email}
                    </a>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-md">
                    <p className="text-slate-900 dark:text-white leading-relaxed">
                      {truncateMessage(r.message)}
                    </p>
                    {r.message.length > 100 && (
                      <button 
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-1"
                        onClick={() => {
                          // Create a simple modal or expand inline
                          alert(`Full message from ${r.name}:\n\n${r.message}`);
                        }}
                      >
                        Show full message
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {formatDate(r.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function AdminMessages() {
  const h = headers();
  const user = h.get("cf-access-authenticated-user-email") || "Unknown user";
  const rows = await getRows(50); // Get more messages

  return (
    <main className="min-h-screen w-full bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Admin Dashboard
          </h1>
          <div className="flex items-center justify-between mt-2">
            <p className="text-slate-500 dark:text-slate-400">
              Signed in via Cloudflare Access as{' '}
              <span className="font-medium text-slate-900 dark:text-white">{user}</span>
            </p>
            <div className="flex space-x-3">
              <a
                href="/api/health"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Health Check
              </a>
              <a
                href="/"
                className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                ← Back to Site
              </a>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        }>
          <StatsCards />
        </Suspense>

        {/* Messages Table */}
        <MessageTable rows={rows} />

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
            <div>
              <span>TalkTech Admin Dashboard • Protected by Cloudflare Access</span>
            </div>
            <div>
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
