
import { headers } from "next/headers";

export const runtime = "edge";

async function getRows() {
  const h = headers();
  const host = h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  const origin = `${proto}://${host}`;
  const res = await fetch(`${origin}/api/messages`, { cache: "no-store", headers: { "accept": "application/json" } });
  if (!res.ok) return [];
  const json = await res.json();
  return json.rows || json.results || [];
}

export default async function AdminMessages() {
  const h = headers();
  const user = h.get("cf-access-authenticated-user-email") || "Unknown user";
  const rows = await getRows();

  return (
    <main className="min-h-screen w-full">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Messages</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Signed in via Cloudflare Access as <span className="font-medium">{user}</span>.
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Message</th>
                <th className="px-4 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No messages yet.</td>
                </tr>
              )}
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800 align-top">
                  <td className="px-4 py-3">{r.id}</td>
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3 whitespace-pre-wrap max-w-xl">{r.message}</td>
                  <td className="px-4 py-3">{r.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
