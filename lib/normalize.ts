export function normalizeWord(input: string) {
  const raw = (input ?? "").trim();
  const norm = raw.replace(/\s+/g, " ").toLowerCase();
  return { raw, norm };
}
