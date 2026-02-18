import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function q<T = any>(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function dbInsertSubmission(
  wordRaw: string,
  wordNorm: string,
  realScore: number
) {
  const res = await pool.query(
    `
    insert into submissions(word_raw, word_norm, real_score)
    values ($1, $2, $3)
    returning id, created_at, word_norm, real_score
    `,
    [wordRaw, wordNorm, realScore]
  );

  return res.rows[0];
}
