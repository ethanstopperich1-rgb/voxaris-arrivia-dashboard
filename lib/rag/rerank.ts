import { cohere } from "@/lib/clients/cohere";
import { MODELS, TIMEOUTS_MS } from "@/lib/config/constants";
import { withTimeout } from "@/lib/utils/timeout";
import type { RetrievedChunk } from "./hybrid-search";

export type RerankedChunk = RetrievedChunk & { rerank_score: number };

export async function rerankChunks(opts: {
  query: string;
  chunks: RetrievedChunk[];
  topN?: number;
}): Promise<RerankedChunk[]> {
  const topN = opts.topN ?? 6;
  if (opts.chunks.length === 0) return [];
  try {
    const res = await withTimeout(
      cohere().rerank({
        model: MODELS.RERANK,
        query: opts.query,
        documents: opts.chunks.map((c) => c.body),
        topN,
      }),
      TIMEOUTS_MS.COHERE_RERANK,
      "cohere_rerank",
    );
    return res.results
      .map((r) => ({ ...opts.chunks[r.index]!, rerank_score: r.relevanceScore }))
      .sort((a, b) => b.rerank_score - a.rerank_score);
  } catch {
    return opts.chunks.slice(0, topN).map((c) => ({ ...c, rerank_score: c.rrf_score }));
  }
}
