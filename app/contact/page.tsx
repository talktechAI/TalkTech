"use client";

import React, { useEffect, useState } from "react";
import Script from "next/script";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  // Optional: re-render token on mount to ensure widget initializes
  useEffect(() => {
    // nothing required; Turnstile will auto-inject hidden input
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const tokenEl = form.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement | null;
    const turnstileToken = tokenEl?.value || "";

    const body = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      message: String(formData.get("message") || ""),
      turnstileToken,
    };

    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Request failed");
      setStatus("done");
      form.reset();
      // Reset Turnstile widget token (if available)
      try { (window as any).turnstile?.reset(); } catch {}
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Unknown error");
    }
  }

  return (
    <main className="min-h-screen w-full">
      {/* Turnstile script */}
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Contact</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Send us a message and we’ll get back to you.
        </p>

        <form onSubmit={onSubmit} className="mt-8 grid gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input required name="name" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input required type="email" name="email" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea required name="message" rows={5} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500"></textarea>
          </div>

          {/* Turnstile widget */}
          <div className="cf-turnstile" data-sitekey={siteKey} data-theme="auto"></div>

          <div className="flex items-center gap-3">
            <button disabled={status==="sending"} className="px-5 py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-medium shadow hover:shadow-md transition disabled:opacity-60" type="submit">
              {status==="sending" ? "Sending..." : "Send message"}
            </button>
            {status==="done" && <span className="text-sm text-emerald-600">Thanks — we got it!</span>}
            {status==="error" && <span className="text-sm text-rose-600">Error: {error}</span>}
          </div>
          {!siteKey && <p className="text-xs text-amber-600">Set NEXT_PUBLIC_TURNSTILE_SITE_KEY to enable CAPTCHA.</p>}
        </form>

        <div className="mt-10 space-y-2 text-xs text-slate-500 dark:text-slate-400">
          <p>This form posts to <code>/api/contact</code> and verifies Cloudflare Turnstile on the server.</p>
          <p>Set <code>CF_CONTACT_WEBHOOK</code> to forward submissions and bind <code>TALKTECH_DB</code> (D1) to store them.</p>
        </div>
      </div>
    </main>
  );
}
