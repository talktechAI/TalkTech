// middleware.ts
import { NextResponse } from 'next/server';

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/messages'],
};

export function middleware(req: Request) {
  const h = req.headers;
  // Cloudflare Access adds one of these when authenticated:
  const hasCF = h.has('cf-access-jwt-assertion') ||
                h.has('cf-access-verified-email') ||
                h.has('cf-access-authenticated-user-email');
  if (hasCF) return NextResponse.next();

  // Optional dev fallback: pre-shared header
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && h.get('x-admin-secret') === adminSecret) {
    return NextResponse.next();
  }
  return new NextResponse('Unauthorized', { status: 401 });
}
