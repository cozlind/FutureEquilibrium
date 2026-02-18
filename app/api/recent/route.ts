import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export async function GET() {
  const rows = await q(
    `select id, word_raw, word_norm, symbolic_score, created_at
     from submissions
     order by id desc
     limit 10`
  );

  return NextResponse.json({ ok: true, rows });
}
