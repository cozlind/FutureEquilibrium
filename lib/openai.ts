import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

export async function classifyKeywordScore(keyword: string): Promise<number> {
  const system = [
    "Score a single keyword for an art installation.",
    "Return JSON only matching the schema.",
    "score must be a REAL NUMBER in [-1, 1].",
    "Use decimal precision like 0.37 or -0.82. Do NOT round to integers.",
    "+1 = strongly order, -1 = strongly chaos, 0 = neutral/unclear.",
  ].join("\n");

  const resp = await client.responses.create({
    model: "gpt-5-mini",
    reasoning: { effort: "minimal" },
    input: [
      { role: "system", content: system },
      { role: "user", content: String(keyword ?? "").trim() },
    ],
    max_output_tokens: 80,
    text: {
      format: {
        type: "json_schema",
        name: "score_only",
        schema: {
          type: "object",
          additionalProperties: false, // 必须
          properties: {
            score: { type: "number" },
          },
          required: ["score"],
        },
      },
    },
  });

  const text = String((resp as any).output_text ?? "{}").trim();
  console.log("[LLM raw output]", text);

  let score = 0;
  try {
    const obj = JSON.parse(text);
    score = Number(obj?.score);
  } catch {
    score = 0;
  }

  if (!Number.isFinite(score)) score = 0;
  return clamp(score, -1, 1);
}
