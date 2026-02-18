import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import crypto from "crypto";

function requireAdmin(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  return token && token === process.env.ADMIN_TOKEN;
}

// 假分析：跑通链路用。后面替换成真实 LLM 批量调用
function fakeClassify(wordNorm: string): {
  pos: "order" | "chaos" | "neutral";
  score: number;        // -1.0 .. +1.0
  confidence: number;   // 0..1
} {
  const w = (wordNorm ?? "").trim();

  // 中英文提示词分开处理，英文统一小写
  const wLower = w.toLowerCase();

  const orderHintsCN = ["秩序", "规则", "稳定", "监管"];
  const chaosHintsCN = ["混乱", "失控", "崩坏", "无序"];

  const orderHintsEN = ["control", "order", "rule", "stable", "govern"];
  const chaosHintsEN = ["chaos", "collapse", "random", "anarchy"];

  const hitOrder =
    orderHintsCN.some(k => w.includes(k)) ||
    orderHintsEN.some(k => wLower.includes(k));

  const hitChaos =
    chaosHintsCN.some(k => w.includes(k)) ||
    chaosHintsEN.some(k => wLower.includes(k));

  if (hitOrder && !hitChaos) return { pos: "order", score: 1.0, confidence: 0.75 };
  if (!hitOrder && hitChaos) return { pos: "chaos", score: -1.0, confidence: 0.75 };
  return { pos: "neutral", score: 0.0, confidence: 0.55 };
}

export async function POST(req: Request) {
  try {
    if (!requireAdmin(req)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit ?? 30), 1), 200);
    const batchId = crypto.randomUUID();

    // 取还没分析过的 submissions（analyzed_at 为空）
    const subs = await q<{ id: string; word_norm: string }>(
      `select id, word_norm
       from submissions
       where analyzed_at is null
       order by id asc
       limit $1`,
      [limit]
    );

    if (subs.length === 0) {
      return NextResponse.json({ ok: true, batch_id: batchId, processed: 0 });
    }

    // 逐条处理（先简单；后面接 LLM 时会改成批量）
    for (const s of subs) {
      const r = fakeClassify(s.word_norm);

      // 写 analyses：保留可追溯性（你也可以后面再删减字段）
      await q(
        `insert into analyses(submission_id, pos, score, confidence, batch_id)
         values ($1, $2, $3, $4, $5)`,
        [Number(s.id), r.pos, r.score, r.confidence, batchId]
      );

      // 写回 submissions：最终统计只看 real_score / analyzed_at
      await q(
        `update submissions
         set real_score = $1,
             analyzed_at = now()
         where id = $2`,
        [r.score, Number(s.id)]
      );
    }

    return NextResponse.json({
      ok: true,
      batch_id: batchId,
      processed: subs.length,
    });
  } catch (e: any) {
    console.error("run-batch failed:", e);
    return NextResponse.json(
      { ok: false, error: "run-batch failed", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
