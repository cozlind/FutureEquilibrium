import { NextResponse } from "next/server";
import { dbInsertSubmission, q } from "@/lib/db";
import { normalizeWord } from "@/lib/normalize";
import { classifyKeywordScore } from "@/lib/openai";
import { Semaphore, withSemaphore } from "@/lib/llmLimit";
import { retry429 } from "@/lib/retry";

const MAX_LEN = 60;

// 每个实例最多 3 个并发 LLM
const LLM_CONCURRENCY = 3;
const llmSem = new Semaphore(LLM_CONCURRENCY);

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

export async function POST(req: Request) {
  let raw = "";
  let norm = "";

  try {
    const body = await req.json();
    const input = String(body?.word ?? "");
    const r = normalizeWord(input);
    raw = r.raw;
    norm = r.norm;
  } catch {
    return NextResponse.json(
      { ok: false, error: "json parse failed" },
      { status: 400 }
    );
  }

  if (!raw) {
    return NextResponse.json(
      { ok: false, error: "empty word" },
      { status: 400 }
    );
  }

  if (raw.length > MAX_LEN) {
    return NextResponse.json(
      { ok: false, error: "too long", max_len: MAX_LEN },
      { status: 400 }
    );
  }

  try {
    // ============================
    // 1️⃣ 先查缓存表
    // ============================
    const cached = await q<{ score: number }>(
      `
      select score
      from keyword_cache
      where word_norm = $1
      limit 1
      `,
      [norm]
    );

    if (cached.length > 0) {
      const score = clamp(Number(cached[0].score) ?? 0, -1, 1);

      const row = await dbInsertSubmission(raw, norm, score);

      return NextResponse.json({
        ok: true,
        submission_id: row.id,
        score,
        cached: true,
      });
    }

    // ============================
    // 2️⃣ 没有缓存 → 调用 LLM
    // ============================
    let score = 0;

    try {
      score = await withSemaphore(llmSem, () =>
        retry429(() => classifyKeywordScore(norm))
      );
    } catch (err) {
      console.error("LLM failed, fallback to 0:", err);
      score = 0;
    }

    score = clamp(score, -1, 1);

    // ============================
    // 3️⃣ 写缓存（防止未来重复调用）
    // ============================
    await q(
      `
      insert into keyword_cache(word_norm, score)
      values ($1, $2)
      on conflict (word_norm) do nothing
      `,
      [norm, score]
    );

    // ============================
    // 4️⃣ 写 submission 记录
    // ============================
    const row = await dbInsertSubmission(raw, norm, score);

    await q(
      `
      update submissions
      set analyzed_at = now()
      where id = $1
      `,
      [row.id]
    );

    return NextResponse.json({
      ok: true,
      submission_id: row.id,
      score,
      cached: false,
    });

  } catch (e: any) {
    console.error("submit failed:", e);

    return NextResponse.json(
      {
        ok: false,
        error: "submit failed",
        message: e?.message ?? null,
      },
      { status: 500 }
    );
  }
}
