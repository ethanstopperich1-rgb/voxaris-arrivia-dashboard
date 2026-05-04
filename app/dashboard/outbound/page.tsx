// Outbound dialer page — agent is locked by the top-of-page switcher,
// the form just collects phone + name + dynamic-variable overrides
// before dispatching the call.

import { OutboundCallForm } from "./OutboundCallForm";
import { PageHeader } from "../components/agent/PageHeader";
import { resolveAgent, agentMeta, dbAgentName } from "@/lib/dashboard/agent";

export const dynamic = "force-dynamic";

export default async function OutboundPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>;
}) {
  const sp = await searchParams;
  const agent = resolveAgent(sp);
  const meta = agentMeta(agent);
  const dbAgent = dbAgentName(agent) as "deedy-vba" | "andie-gvr";

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-8 py-12">
      <PageHeader
        eyebrow={`VOXARIS · ${meta.label.toUpperCase()} · OUTBOUND`}
        title={`Place a call as ${meta.label}`}
        subtitle={`Dispatch ${meta.label} (${meta.sublabel}) to dial a number now. The agent runs the full conversation flow the moment the recipient picks up.`}
        agent={agent}
      />

      <OutboundCallForm lockedAgent={dbAgent} />

      <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-200">How it works</h2>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-neutral-400">
          <li>
            {meta.label} is selected (use the top tabs to switch agent). Type the
            number you want dialed.
          </li>
          <li>
            Optionally fill the recipient name + dynamic variables — they get
            substituted into {meta.label}'s prompt at runtime.
          </li>
          <li>Voxaris dispatches the agent and dials out instantly.</li>
          <li>
            On answer the agent greets, qualifies, and uses its tools (
            {agent === "deedy"
              ? "opc_book, send_sms_confirmation, transfer_to_human"
              : "transfer_to_specialist, send_scheduler_link, verify_me_to_caller"}
            ).
          </li>
          <li>
            Track the call live in{" "}
            <a
              href={`/dashboard/calls?agent=${agent}`}
              className="text-cyan-300 underline"
            >
              {meta.label}'s recent calls
            </a>{" "}
            — recording, transcript, and summary land automatically when the
            call ends.
          </li>
        </ol>
      </section>
    </main>
  );
}
