import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { LatencyCards } from "./components/LatencyCards";
import { ActiveCallTable } from "./components/ActiveCallTable";
import { TransferPanel } from "./components/TransferPanel";
import { VerificationPanel } from "./components/VerificationPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadSummary() {
  const sb = supabaseAdmin();
  const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const [{ data: calls }, { data: transfers }, { data: turns }, { data: latencies }] = await Promise.all([
    sb
      .from("call_sessions")
      .select("id, retell_call_id, started_at, ended_at, outcome, transfer_success")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(20),
    sb.from("transfer_contexts").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(10),
    sb.from("evidence_ledgers").select("verifier_verdict").gte("created_at", since),
    sb.from("latency_events").select("event, duration_ms").not("duration_ms", "is", null).gte("created_at", since).limit(2000),
  ]);
  return { calls: calls ?? [], transfers: transfers ?? [], turns: turns ?? [], latencies: latencies ?? [] };
}

export default async function DashboardPage() {
  const data = await loadSummary();
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-8 py-12">
      <header>
        <p className="text-xs uppercase tracking-widest text-cyan-400">VOXARIS · CONFIDENTIAL</p>
        <h1 className="mt-2 text-3xl font-semibold">GVR Live Ops Dashboard</h1>
        <p className="text-sm text-neutral-400">Last 6 hours.</p>
      </header>
      <LatencyCards latencies={data.latencies} />
      <section className="grid gap-8 lg:grid-cols-2">
        <VerificationPanel turns={data.turns} />
        <TransferPanel transfers={data.transfers} />
      </section>
      <ActiveCallTable calls={data.calls} />
    </main>
  );
}
