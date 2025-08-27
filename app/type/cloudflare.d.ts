// types/cloudflare.d.ts
declare global {
  interface CloudflareEnv {
    // Turnstile configuration
    TURNSTILE_SECRET_KEY?: string;
    
    // Optional webhook for contact form submissions
    CF_CONTACT_WEBHOOK?: string;
    
    // Rate limiting configuration
    RATE_LIMIT_WINDOW_SECS?: string;
    RATE_LIMIT_MAX?: string;
    
    // Site origin for CSRF protection
    NEXT_PUBLIC_SITE_ORIGIN?: string;
    
    // Database and KV bindings
    TALKTECH_DB?: D1Database; // D1 database binding
    TALKTECH_KV?: KVNamespace; // KV namespace binding
  }
}

export {};