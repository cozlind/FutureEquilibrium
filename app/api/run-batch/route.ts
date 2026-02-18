import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import crypto from "crypto";
import { classifyKeywordsBatch } from "@/lib/openai";

function requireAdmin(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  return token && token === process.env.ADMIN_TOKEN;
}

export async function POST(req: Request) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body?.limit ?? 30), 1), 200);
  const batchId = crypto.randomUUID();

  try {
    await q("begin");

    const subs = await q<{ id: string; word_norm: string }>(
      `
      select id, word_norm
      from submissions
      where analyzed_at is null
      order by id asc
      limit $1
      for update skip locked
      `,
      [limit]
    );

    if (subs.length === 0) {
      await q("commit");
      return NextResponse.json({ ok: true, batch_id: batchId, processed: 0 });
    }

    const keywords = subs.map(s => s.word_norm ?? "");

    let results;

    try {
      results = await classifyKeywordsBatch(keywords);
    } catch (llmError) {
      console.error("LLM failed, fallback to neutral:", llmError);

      // fallback: mark all as neutral so system never blocks
      results = subs.map(() => ({
        pos: "neutral" as const,
        score: 0,
        confidence: 0.1,
      }));
    }

    for (let i = 0; i < subs.length; i++) {
      const s = subs[i];
      const r = results[i];

      await q(
        `
        insert into analyses(submission_id, pos, score, confidence, batch_id)
        values ($1, $2, $3, $4, $5)
        `,
        [Number(s.id), r.pos, r.score, r.confidence, batchId]
      );

      await q(
        `
        update submissions
        set real_score = $1,
            analyzed_at = now()
        where id = $2
        `,
        [r.score, Number(s.id)]
      );
    }

    await q("commit");

    return NextResponse.json({
      ok: true,
      batch_id: batchId,
      processed: subs.length,
    });

  } catch (err: any) {
    await q("rollback");
    console.error("run-batch fatal error:", err);

    return NextResponse.json(
      { ok: false, error: "run-batch failed", message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
