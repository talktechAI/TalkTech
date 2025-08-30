'use client';

import { useEffect } from 'react';

export default function AdminThemeToggle() {
  // Initialize theme on mount (replaces the inline <script>)
  useEffect(() => {
    try {
      const html = document.documentElement;
      const stored = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      if (stored === 'dark' || (!stored && prefersDark)) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    } catch {
      // no-op (SSR / privacy mode)
    }
  }, []);

  const toggle = () => {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  };

  return (
    <button
      onClick={toggle}
      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md"
      title="Toggle theme"
      type="button"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
