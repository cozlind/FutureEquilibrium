import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type LlmResult = {
    pos: "order" | "chaos" | "neutral";
    score: number;        // -1.0 .. +1.0
    confidence: number;   // 0 .. 1
};

function clamp(x: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, x));
}

function normalizeResult(x: any): LlmResult {
    const pos = x?.pos;
    let score = Number(x?.score);
    let confidence = Number(x?.confidence);

    if (!["order", "chaos", "neutral"].includes(pos)) {
        return { pos: "neutral", score: 0, confidence: 0.3 };
    }
    if (!Number.isFinite(score)) score = 0;
    if (!Number.isFinite(confidence)) confidence = 0.5;

    return {
        pos,
        score: clamp(score, -1, 1),
        confidence: clamp(confidence, 0, 1),
    };
}

/**
 * Batch classify keywords (any language) into order/chaos tendency.
 * Must return results in the same order as inputs.
 */
export async function classifyKeywordsBatch(keywords: string[]): Promise<LlmResult[]> {
    const items = keywords.map((k, i) => ({
        id: i,
        keyword: String(k ?? "").trim(),
    }));

    const system = [
        "You are an assistant for an interactive art installation.",
        "The installation asks visitors:",
        "\"Do you think the world’s future will trend more toward order or toward chaos?\"",
        "",
        "Input is a list of keywords or short phrases. Each item can be in ANY language (Japanese/English/Chinese/etc.).",
        "",
        "For EACH item, infer whether it leans toward ORDER, CHAOS, or NEUTRAL/AMBIGUOUS under that theme.",
        "",
        "Return a JSON array of objects, one per input item, using the same id.",
        "Output MUST be valid JSON matching the provided schema. Do not output any extra text.",
        "",
        "Scoring rules:",
        "- score in [-1.0, +1.0]. +1 means strongly toward ORDER, -1 means strongly toward CHAOS, 0 means neutral/uncertain.",
        "- confidence in [0, 1]. Reflect uncertainty due to ambiguity/context.",
        "- pos: 'order' | 'chaos' | 'neutral'.",
        "",
        "If an item is unclear without context, prefer neutral with lower confidence.",
    ].join("\n");

    const user = `Items:\n${JSON.stringify(items)}`;

    const resp = await client.responses.create({
        model: "gpt-5-mini",
        input: [
            { role: "system", content: system },
            { role: "user", content: user },
        ],
        text: {
            format: {
                type: "json_schema",
                name: "keyword_batch_classification",
                schema: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        results: {
                            type: "array",
                            items: {
                                type: "object",
                                additionalProperties: false,
                                properties: {
                                    id: { type: "integer" },
                                    pos: { type: "string", enum: ["order", "chaos", "neutral"] },
                                    score: { type: "number", minimum: -1, maximum: 1 },
                                    confidence: { type: "number", minimum: 0, maximum: 1 },
                                },
                                required: ["id", "pos", "score", "confidence"],
                            },
                        },
                    },
                    required: ["results"],
                },
            },
        },
    });

    const text = (resp as any).output_text ?? "[]";
    const obj = JSON.parse(text);
const arr = Array.isArray(obj?.results) ? obj.results : [];

    // Build result array aligned with input order
    const out: LlmResult[] = new Array(items.length).fill(null).map(() => ({
        pos: "neutral",
        score: 0,
        confidence: 0.3,
    }));

    if (Array.isArray(arr)) {
        for (const x of arr) {
            const id = Number(x?.id);
            if (Number.isInteger(id) && id >= 0 && id < out.length) {
                out[id] = normalizeResult(x);
            }
        }
    }

    return out;
}
