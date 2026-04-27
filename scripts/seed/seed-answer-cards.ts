import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { supabaseAdmin } from "../../lib/clients/supabase-admin";

async function main() {
  const dir = join(process.cwd(), "content/answer-cards");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const rows = files.map((f) => {
    const c = JSON.parse(readFileSync(join(dir, f), "utf8"));
    return {
      id: c.id,
      brand: "GVR",
      intent: c.intent,
      triggers: c.triggers,
      response_text: c.response_text,
      fact_ids: c.fact_ids,
      risk_class: c.risk_class,
      requires_verifier: c.requires_verifier,
      next_action: c.next_action,
      approved: true,
    };
  });
  const { error } = await supabaseAdmin().from("answer_cards").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  console.log(`Seeded ${rows.length} answer cards.`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
