import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SpecialistScreenPop({
  params,
}: {
  params: Promise<{ contextId: string }>;
}) {
  const { contextId } = await params;
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("transfer_contexts")
    .select("*")
    .eq("id", contextId)
    .maybeSingle();
  if (error || !data) notFound();

  const evidence = (data.evidence_ledger_ids as string[]) ?? [];
  const slots = (data.qualifying_data as Record<string, string>) ?? {};

  return (
    <main className="mx-auto max-w-3xl px-8 py-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-cyan-400">SPECIALIST SCREEN-POP</p>
        <h1 className="mt-2 text-2xl font-semibold">Incoming GVR transfer</h1>
        <p className="text-sm text-neutral-400">Caller {data.caller_phone} · {data.endpoint_kind}</p>
      </header>

      <section className="mb-6 rounded-lg border border-cyan-900 bg-cyan-950/30 p-5">
        <h2 className="text-xs uppercase tracking-wider text-cyan-300">Whisper preview</h2>
        <p className="mt-2 text-sm">{data.whisper_text}</p>
      </section>

      <section className="mb-6 rounded-lg border border-neutral-800 p-5">
        <h2 className="text-xs uppercase tracking-wider text-neutral-400">Reason</h2>
        <p className="mt-1 text-base">{data.reason}</p>
      </section>

      <section className="mb-6 rounded-lg border border-neutral-800 p-5">
        <h2 className="text-xs uppercase tracking-wider text-neutral-400">Conversation summary</h2>
        <pre className="mt-2 whitespace-pre-wrap text-sm text-neutral-300">{data.conversation_summary}</pre>
      </section>

      {Object.keys(slots).length > 0 && (
        <section className="mb-6 rounded-lg border border-neutral-800 p-5">
          <h2 className="text-xs uppercase tracking-wider text-neutral-400">Qualifying data</h2>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {Object.entries(slots).map(([k, v]) => (
              <div key={k}>
                <dt className="text-neutral-500">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="rounded-lg border border-neutral-800 p-5 text-xs text-neutral-500">
        <p>Context ID: {data.id}</p>
        <p>Evidence ledger IDs: {evidence.join(", ") || "—"}</p>
        <p>SMS: {data.sms_sent_at ? `sent ${new Date(data.sms_sent_at).toLocaleTimeString()}` : "pending"}</p>
        <p>Outcome: {data.outcome ?? "in-flight"}</p>
      </section>
    </main>
  );
}
