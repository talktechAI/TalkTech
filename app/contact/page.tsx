// app/contact/page.tsx
import ContactForm from "@/components/ContactForm";

export default function Page() {
  // Read the site key on the server (TS knows 'process' after @types/node)
  const siteKey = process.env.TURNSTILE_SITE_KEY ?? "";
  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-4">Contact TalkTech</h1>
      <ContactForm siteKey={siteKey} />
    </main>
  );
}
