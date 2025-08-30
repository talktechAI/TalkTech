// app/api/ping/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge'; // ✅ allowed on Route Handlers

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'ping',
      time: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
