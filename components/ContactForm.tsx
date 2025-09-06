"use client";
import { useEffect, useRef, useState } from "react";

declare global { interface Window { turnstile: any } }

export default function ContactForm({ siteKey }: { siteKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    document.head.appendChild(s);
    s.onload = () => {
      if (ref.current && window.turnstile) {
        window.turnstile.render(ref.current, {
          sitekey: siteKey,
          callback: (t: string) => setToken(t),
          "retry-interval": 800,
        });
      }
    };
    return () => { document.head.removeChild(s); };
  }, [siteKey]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const payload = {
      name: fd.get("name"),
      email: fd.get("email"),
      message: fd.get("message"),
      turnstileToken: token,
    };
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) alert("Error. Please try again.");
    else alert("Thanks! We’ll be in touch.");
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <input name="name" placeholder="Your name" required className="border p-2 rounded" />
      <input name="email" type="email" placeholder="you@example.com" required className="border p-2 rounded" />
      <textarea name="message" placeholder="Tell us about your project" required className="border p-2 rounded min-h-28" />
      <div ref={ref} className="my-2" />
      <button disabled={!token} className="rounded px-4 py-2 border">Send</button>
    </form>
  );
}
