import "dotenv/config";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { supabaseAdmin } from "../../lib/clients/supabase-admin";
import { chunkMarkdown } from "../../lib/rag/chunker";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".md")) out.push(p);
  }
  return out;
}

async function main() {
  const sb = supabaseAdmin();
  const root = join(process.cwd(), "content/kb");
  const files = walk(root);
  console.log(`Ingesting ${files.length} KB markdown files…`);

  let inserted = 0;
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const source_doc = file.replace(`${root}/`, "");
    const chunks = chunkMarkdown({ source_doc, text });
    if (chunks.length === 0) continue;
    const { error } = await sb.from("kb_chunks").insert(
      chunks.map((c) => ({
        brand: "GVR",
        source_doc: c.source_doc,
        section: c.section,
        chunk_index: c.chunk_index,
        body: c.body,
        approved: true,
        risk_class: "general",
        allowed_claims: [],
        forbidden_extrapolations: [],
        metadata: { token_count: c.token_count },
      })),
    );
    if (error) console.warn(`failed to insert ${source_doc}:`, error.message);
    else inserted += chunks.length;
  }
  console.log(`Inserted ${inserted} chunks. Run embed:kb to populate embeddings.`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
