// app/admin/dashboard/DashboardClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type Contact = {
  id: number;
  name: string;
  email: string;
  message: string;
  created_at: string;
  ip: string;
};

type Initial = {
  user: string;
  stats: { total: number; today: number; week: number; month: number } | null;
  contacts: Contact[];
};

type ContactsResponse = {
  ok: boolean;
  data: Contact[];
  pagination: { page: number; limit: number; total: number; pages: number };
  error?: string;
};

export default function DashboardClient({ initial }: { initial: Initial }) {
  // ---- state
  const [stats, setStats] = useState(initial.stats);
  const [contacts, setContacts] = useState<Contact[]>(initial.contacts || []);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState<number>(initial.contacts?.length ?? 0);

  // ---- helpers
  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString();
    } catch {
      return s;
    }
  };

  const truncate = (msg: string, n = 100) =>
    msg?.length > n ? msg.slice(0, n) + '…' : msg;

  // ---- client actions
  async function refreshStats() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/stats', {
        cache: 'no-store',
        headers: { accept: 'application/json' },
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed to load stats');
      setStats(json.stats ?? null);
    } catch (e: any) {
      setErr(e?.message || 'Failed to refresh stats');
    } finally {
      setLoading(false);
    }
  }

  async function loadPage(nextPage: number) {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/contacts?page=${nextPage}&limit=${limit}`, {
        cache: 'no-store',
        headers: { accept: 'application/json' },
      });
      const json: ContactsResponse = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed to load contacts');

      setContacts(Array.isArray(json.data) ? json.data : []);
      setPage(json.pagination.page);
      setPages(json.pagination.pages);
      setTotal(json.pagination.total);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }

  async function deleteContact(id: number) {
    if (!confirm('Delete this contact?')) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/contacts?id=${id}`, {
        method: 'DELETE',
        headers: { accept: 'application/json' },
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Delete failed');
      // reload current page
      await loadPage(page);
    } catch (e: any) {
      setErr(e?.message || 'Failed to delete contact');
    } finally {
      setLoading(false);
    }
  }

  // Optional: load pagination metadata on mount if server didn’t supply it
  useEffect(() => {
    // If server didn’t prefill pagination, fetch once to get counts
    if (!initial.contacts?.length) {
      loadPage(1).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- UI
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Signed in as <span className="font-medium">{initial.user}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Health Check
            </a>
            <button
              type="button"
              onClick={refreshStats}
              disabled={loading}
              className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Refresh Stats
            </button>
          </div>
        </div>

        {/* Error */}
        {err && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 rounded">
            {err}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total', value: stats?.total ?? '-' },
            { label: 'Today', value: stats?.today ?? '-' },
            { label: 'This Week', value: stats?.week ?? '-' },
            { label: 'This Month', value: stats?.month ?? '-' },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Contacts Table */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Contacts
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {total} total
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                      <a
                        href={`mailto:${c.email}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                      >
                        {c.email}
                      </a>
                      <div className="text-xs text-gray-400 dark:text-gray-500">IP: {c.ip}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white">
                      {truncate(c.message)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        type="button"
                        onClick={() => alert(`Full message from ${c.name}:\n\n${c.message}`)}
                        className="text-blue-600 dark:text-blue-400 hover:underline mr-3"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteContact(c.id)}
                        disabled={loading}
                        className="text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {contacts.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                    >
                      No contacts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white dark:bg-gray-800 px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Page {page} of {pages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadPage(page - 1)}
                disabled={loading || page <= 1}
                className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => loadPage(page + 1)}
                disabled={loading || page >= pages}
                className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
