import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { embedQuery } from "./embeddings";
import { TIMEOUTS_MS } from "@/lib/config/constants";
import { withTimeout } from "@/lib/utils/timeout";

export type RetrievedChunk = {
  id: string;
  source_doc: string;
  section: string;
  body: string;
  similarity?: number;
  rank?: number;
  rrf_score: number;
  allowed_claims: string[];
  forbidden_extrapolations: string[];
  metadata: Record<string, unknown>;
};

const RRF_K = 60;

export async function hybridSearch(opts: {
  query: string;
  brand?: string;
  topK?: number;
}): Promise<RetrievedChunk[]> {
  const brand = opts.brand ?? "GVR";
  const topK = opts.topK ?? 20;

  const sb = supabaseAdmin();
  const embedding = await embedQuery(opts.query);

  type Row = {
    id: string;
    source_doc: string;
    section: string;
    body: string;
    similarity?: number;
    rank?: number;
    allowed_claims: string[];
    forbidden_extrapolations: string[];
    metadata: Record<string, unknown>;
  };
  type RpcResult = { data: Row[] | null; error: { message: string } | null };

  const [vecRes, ftsRes] = await Promise.allSettled([
    withTimeout<RpcResult>(
      Promise.resolve(
        sb.rpc("match_kb_chunks", {
          query_embedding: embedding,
          match_count: topK,
          brand_filter: brand,
        }) as unknown as Promise<RpcResult>,
      ),
      TIMEOUTS_MS.RAG_VECTOR,
      "rag_vector",
    ),
    withTimeout<RpcResult>(
      Promise.resolve(
        sb.rpc("search_kb_chunks_fulltext", {
          query_text: opts.query,
          match_count: topK,
          brand_filter: brand,
        }) as unknown as Promise<RpcResult>,
      ),
      TIMEOUTS_MS.RAG_BM25,
      "rag_bm25",
    ),
  ]);

  const vec: Row[] =
    vecRes.status === "fulfilled" && !vecRes.value.error ? (vecRes.value.data ?? []) : [];
  const fts: Row[] =
    ftsRes.status === "fulfilled" && !ftsRes.value.error ? (ftsRes.value.data ?? []) : [];

  const fused = new Map<string, RetrievedChunk>();
  vec.forEach((r, i) => {
    fused.set(r.id, {
      id: r.id,
      source_doc: r.source_doc,
      section: r.section,
      body: r.body,
      similarity: r.similarity,
      rrf_score: 1 / (RRF_K + i + 1),
      allowed_claims: r.allowed_claims ?? [],
      forbidden_extrapolations: r.forbidden_extrapolations ?? [],
      metadata: r.metadata ?? {},
    });
  });
  fts.forEach((r, i) => {
    const cur = fused.get(r.id);
    const add = 1 / (RRF_K + i + 1);
    if (cur) {
      cur.rrf_score += add;
      cur.rank = i + 1;
    } else {
      fused.set(r.id, {
        id: r.id,
        source_doc: r.source_doc,
        section: r.section,
        body: r.body,
        rank: i + 1,
        rrf_score: add,
        allowed_claims: r.allowed_claims ?? [],
        forbidden_extrapolations: r.forbidden_extrapolations ?? [],
        metadata: r.metadata ?? {},
      });
    }
  });

  return [...fused.values()].sort((a, b) => b.rrf_score - a.rrf_score).slice(0, topK);
}
