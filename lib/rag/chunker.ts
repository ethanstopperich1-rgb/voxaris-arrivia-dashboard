export type Chunk = {
  source_doc: string;
  section: string;
  chunk_index: number;
  body: string;
  token_count: number;
};

const APPROX_TOKENS_PER_CHAR = 0.25; // ~4 chars/token English

function approxTokens(s: string): number {
  return Math.ceil(s.length * APPROX_TOKENS_PER_CHAR);
}

export function chunkMarkdown(opts: {
  source_doc: string;
  text: string;
  targetTokens?: number;
  overlapTokens?: number;
}): Chunk[] {
  const target = opts.targetTokens ?? 500;
  const overlap = opts.overlapTokens ?? 80;
  const targetChars = Math.floor(target / APPROX_TOKENS_PER_CHAR);
  const overlapChars = Math.floor(overlap / APPROX_TOKENS_PER_CHAR);

  const sections = opts.text.split(/^##?\s+/m);
  const chunks: Chunk[] = [];
  let idx = 0;
  for (const sec of sections) {
    const titleMatch = sec.match(/^([^\n]+)\n/);
    const section = titleMatch ? titleMatch[1]!.trim() : "intro";
    const body = titleMatch ? sec.slice(titleMatch[0].length) : sec;
    const trimmed = body.trim();
    if (!trimmed) continue;
    if (trimmed.length <= targetChars) {
      chunks.push({
        source_doc: opts.source_doc,
        section,
        chunk_index: idx++,
        body: trimmed,
        token_count: approxTokens(trimmed),
      });
      continue;
    }
    let start = 0;
    while (start < trimmed.length) {
      const slice = trimmed.slice(start, start + targetChars);
      chunks.push({
        source_doc: opts.source_doc,
        section,
        chunk_index: idx++,
        body: slice,
        token_count: approxTokens(slice),
      });
      start += targetChars - overlapChars;
    }
  }
  return chunks;
}
