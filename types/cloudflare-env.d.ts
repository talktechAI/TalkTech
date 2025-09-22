export {};

declare global {
  interface CloudflareEnv {
    
    TALKTECH_DB: D1Database;     
    TALKTECH_KV?: KVNamespace;   

    CONTACT_WORKER_URL: string;
    NOTIFICATION_EMAIL?: string;
    SITE_ORIGIN?: string;
    ENVIRONMENT?: string;
    TURNSTILE_SITE_KEY?: string;
    RATE_LIMIT_WINDOW_SECS?: string;
    RATE_LIMIT_MAX?: string;

    WEBHOOK_SECRET: string;
    TURNSTILE_SECRET?: string;      
    TURNSTILE_SECRET_KEY?: string;   
    RESEND_API_KEY?: string;
  }
}
