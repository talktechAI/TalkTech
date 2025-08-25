
import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET() {
  const { env } = getRequestContext();
  const db = (env as any).TALKTECH_DB;
  if (!db) {
    return NextResponse.json({ ok: false, error: "D1 binding TALKTECH_DB is not configured." }, { status: 500 });
  }
  const res = await db.prepare("SELECT id, name, email, message, created_at FROM contact_messages ORDER BY id DESC LIMIT 10").all();
  return NextResponse.json({ ok: true, rows: res.results || res });
}
