// utils/cloudflare-context.ts

// Define the type inline instead of importing
export type CloudflareEnv = {
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SECRET?: string;
  CF_CONTACT_WEBHOOK?: string;
  RATE_LIMIT_WINDOW_SECS?: string;
  RATE_LIMIT_MAX?: string;
  NEXT_PUBLIC_SITE_ORIGIN?: string;
  ALT_SITE_ORIGIN?: string;
  SITE_ORIGIN?: string;
  ALT_SITE_ORIGIN?: string;
  TALKTECH_DB?: any;
  TALKTECH_KV?: any;
  RESEND_API_KEY?: string;
  NOTIFICATION_EMAIL?: string;
};

/**
 * Safely get Cloudflare context - returns null if not in Cloudflare environment
 */
export function getCloudflareEnv(): CloudflareEnv | null {
  try {
    // Check if we're in Cloudflare runtime
    if (typeof globalThis.process === 'undefined') {
      const { getRequestContext } = require('@cloudflare/next-on-pages');
      const context = getRequestContext();
      return context?.env || null;
    }
  } catch (e) {
    // Not in Cloudflare environment or package not available
    console.log('Not in Cloudflare environment');
  }
  return null;
}

/**
 * Get env with defaults for development
 */
export function getEnvWithDefaults(): CloudflareEnv {
  const env = getCloudflareEnv();
  
  if (env) {
    return env;
  }
  
  // Return process.env values for local development
  return {
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    CF_CONTACT_WEBHOOK: process.env.CF_CONTACT_WEBHOOK,
    RATE_LIMIT_WINDOW_SECS: process.env.RATE_LIMIT_WINDOW_SECS || '60',
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX || '5',
    SITE_ORIGIN: process.env.SITE_ORIGIN,
    ALT_SITE_ORIGIN: process.env.ALT_SITE_ORIGIN,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NOTIFICATION_EMAIL: process.env.NOTIFICATION_EMAIL,
    // D1 and KV will be undefined in local dev
    TALKTECH_DB: undefined,
    TALKTECH_KV: undefined,
  } as CloudflareEnv;
}