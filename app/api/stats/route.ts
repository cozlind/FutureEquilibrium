import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export async function GET() {
  const rows = await q<{
    total_count: string;
    real_score_sum: string | null;
  }>(`
    select
      count(*)::bigint as total_count,
      coalesce(sum(real_score), 0) as real_score_sum
    from submissions
  `);

  const r = rows[0];

  return NextResponse.json({
    ok: true,
    total_count: Number(r.total_count),
    real_score_sum: Number(r.real_score_sum ?? 0),
  });
}
