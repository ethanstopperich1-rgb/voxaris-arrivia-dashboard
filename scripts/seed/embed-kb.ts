import "dotenv/config";
import { supabaseAdmin } from "../../lib/clients/supabase-admin";
import { embedBatch } from "../../lib/rag/embeddings";

const BATCH = 50;

async function main() {
  const sb = supabaseAdmin();
  let total = 0;
  while (true) {
    const { data, error } = await sb
      .from("kb_chunks")
      .select("id, body")
      .is("embedding", null)
      .limit(BATCH);
    if (error) throw error;
    if (!data?.length) break;
    const vectors = await embedBatch(data.map((d) => d.body));
    for (let i = 0; i < data.length; i++) {
      await sb.from("kb_chunks").update({ embedding: vectors[i] }).eq("id", data[i]!.id);
    }
    total += data.length;
    console.log(`embedded ${total}…`);
  }
  console.log(`done. embedded ${total} chunks.`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
