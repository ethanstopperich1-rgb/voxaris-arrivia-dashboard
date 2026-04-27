import "dotenv/config";
import { supabaseAdmin } from "../../lib/clients/supabase-admin";
import factsJson from "../../content/facts/facts.json";

type Fact = {
  id: string;
  scope: string;
  category: string;
  canonical: string;
  allowed_phrases: string[];
  forbidden_phrases: string[];
  numeric_values: unknown[];
  transfer_only: boolean;
  risk_class: string;
  source: string;
  last_verified?: string;
  note?: string;
};

async function main() {
  const sb = supabaseAdmin();
  const facts = factsJson.facts as unknown as Fact[];
  const rows = facts.map((f) => ({
    id: f.id,
    brand: "GVR",
    scope: f.scope,
    category: f.category,
    canonical: f.canonical,
    allowed_phrases: f.allowed_phrases,
    forbidden_phrases: f.forbidden_phrases,
    numeric_values: f.numeric_values,
    transfer_only: f.transfer_only,
    risk_class: f.risk_class,
    source: f.source,
    last_verified: f.last_verified ?? null,
    note: f.note ?? null,
  }));
  const { error } = await sb.from("fact_registry").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  console.log(`Seeded ${rows.length} facts.`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
