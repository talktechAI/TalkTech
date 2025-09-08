declare global {
  interface CloudflareEnv {
    /**
     * Public/plain-text configuration (set as plain vars in Pages UI or wrangler.toml)
     */
    CONTACT_WORKER_URL: string;
    NOTIFICATION_EMAIL?: string;
    SITE_ORIGIN?: string;
    ENVIRONMENT?: string;
    TURNSTILE_SITE_KEY?: string;
    RATE_LIMIT_WINDOW_SECS?: string;
    RATE_LIMIT_MAX?: string;

    /**
     * Secrets (set via Wrangler CLI or Pages "Secrets")
     */
    WEBHOOK_SECRET: string;
    TURNSTILE_SECRET?: string;
    TURNSTILE_SECRET_KEY?: string;
    RESEND_API_KEY?: string;
  }
}

export {};
