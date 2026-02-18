import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export async function GET() {
  const rows = await q<{
    total_count: string;
    analyzed_count: string;
    unanalyzed_count: string;
    real_score_sum: string | null;
    last_submission_at: string | null;
  }>(`
    select
      count(*)::bigint as total_count,
      count(*) filter (where analyzed_at is not null)::bigint as analyzed_count,
      count(*) filter (where analyzed_at is null)::bigint as unanalyzed_count,
      coalesce(sum(real_score), 0) as real_score_sum,
      max(created_at) as last_submission_at
    from submissions
  `);

  const r = rows[0];

  const totalCount = Number(r.total_count);
  const analyzedCount = Number(r.analyzed_count);
  const realScoreSum = Number(r.real_score_sum ?? 0);

  // 用于舵机映射的核心值
  const ratio =
    analyzedCount > 0 ? realScoreSum / analyzedCount : 0;

  return NextResponse.json({
    ok: true,
    stats: {
      total_count: totalCount,
      analyzed_count: analyzedCount,
      unanalyzed_count: Number(r.unanalyzed_count),
      real_score_sum: realScoreSum,
      ratio,                        // -1..1 之间
      last_submission_at: r.last_submission_at,
    },
  });
}
