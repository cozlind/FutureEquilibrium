import { NextResponse } from "next/server";
import crypto from "crypto";
import { dbInsertSubmission } from "@/lib/db";
import { normalizeWord } from "@/lib/normalize";

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
    return NextResponse.json({ ok: false, error: "json parse failed" }, { status: 400 });
  }

  if (!raw) return NextResponse.json({ ok: false, error: "empty word" }, { status: 400 });
  if (raw.length > 40) return NextResponse.json({ ok: false, error: "too long" }, { status: 400 });

  // -5..+5 的“象征性值”，稳定但不代表秩序/混乱真实判断
  const symbolic = (crypto.createHash("sha256").update(norm).digest()[0] % 11) - 5;

  try {
    const row = await dbInsertSubmission(raw, norm, symbolic);
    return NextResponse.json({
      ok: true,
      submission_id: row.id,
      created_at: row.created_at,
      word_norm: row.word_norm,
      symbolic_score: row.symbolic_score,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "db failed", message: e?.message ?? null },
      { status: 500 }
    );
  }
}
