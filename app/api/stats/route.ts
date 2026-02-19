import { NextResponse } from "next/server";
import { q } from "@/lib/db";

type Row = {
  total_count: string;
  real_score_sum: string;
};

export async function GET() {
  const [{ total_count, real_score_sum }] =
    await q<Row>(`
      select
        count(*)::bigint as total_count,
        coalesce(sum(real_score), 0)::bigint as real_score_sum
      from submissions
      where created_at > now() - interval '2 hours'
    `);

  const count = Number(total_count);
  const sum = Number(real_score_sum);

  const normalized = count === 0 ? 0 : sum / count;

  return NextResponse.json({
    ok: true,
    normalized, // -1 ~ 1
  });
}
