// types/cloudflare.d.ts
type D1Database = any;
type KVNamespace = any;
declare global {
  interface CloudflareEnv {
    // Turnstile configuration (match your existing code)
    TURNSTILE_SECRET_KEY?: string;        // ✅ Matches your existing code
    
    // Optional webhook for contact form submissions
    CF_CONTACT_WEBHOOK?: string;
    
    // Rate limiting configuration
    RATE_LIMIT_WINDOW_SECS?: string;
    RATE_LIMIT_MAX?: string;
    
    // Site origin for CSRF protection
    NEXT_PUBLIC_SITE_ORIGIN?: string;
    SITE_ORIGIN?: string;
    
    // Database and KV bindings
    TALKTECH_DB?: D1Database; // D1 database binding
    TALKTECH_KV?: KVNamespace; // KV namespace binding

    // Resend and Notification
    RESEND_API_KEY?: string;
    NOTIFICATION_EMAIL?: string;

  }
}

export {};
