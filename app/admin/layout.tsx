// app/admin/layout.tsx
import { Metadata } from 'next';
import AdminThemeToggle from './AdminThemeToggle';

export const metadata: Metadata = {
  title: 'Admin Dashboard | TalkTech',
  description: 'Admin dashboard for managing contacts and site analytics',
  robots: 'noindex, nofollow',
};

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Admin Navigation Bar */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  TalkTech Admin
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <a
                href="/api/health"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-2 rounded-md text-sm font-medium"
              >
                Health Check
              </a>
              <a
                href="/"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-2 rounded-md text-sm font-medium"
              >
                ← Back to Site
              </a>

              {/* Client-only toggle lives here */}
              <AdminThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <div>
              <span>TalkTech Admin Dashboard</span>
            </div>
            <div className="space-x-4">
              <span>Protected by Cloudflare Access</span>
              <a
                href="https://developers.cloudflare.com/pages/functions/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-700 dark:hover:text-gray-200"
              >
                Docs
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
