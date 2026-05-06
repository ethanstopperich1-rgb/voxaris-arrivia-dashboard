// Outbound dialer page — agent is locked by the top-of-page switcher,
// the form just collects phone + name + dynamic-variable overrides
// before dispatching the call.
//
// Deedy is INBOUND-ONLY (after-hours QR-scan booking flow — guests
// always dial in, she never dials out). If someone lands on
// /dashboard/outbound?agent=deedy we render an explainer instead of
// the dial form.

import { redirect } from "next/navigation";
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

  // Outbound is Andie-only by design (Deedy is inbound-only — QR-scan
  // guests dial in, she never cold-calls). Any link to /outbound
  // without ?agent=andie quietly redirects so we don't have to maintain
  // a Deedy-explainer fork.
  if (agent !== "andie") {
    redirect("/dashboard/outbound?agent=andie");
  }

  const meta = agentMeta("andie");
  const dbAgent = dbAgentName("andie") as "andie-gvr";

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      <PageHeader
        eyebrow="VOXARIS · ANDIE · OUTBOUND"
        title={`Place a call as ${meta.label}`}
        subtitle={`Dispatch ${meta.label} (${meta.sublabel}) to dial a number now. The agent runs the full conversation flow the moment the recipient picks up.`}
        agent="andie"
        agentsOnly={["andie"]}
      />

      <OutboundCallForm lockedAgent={dbAgent} />

      <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-200">How it works</h2>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-neutral-400">
          <li>
            {meta.label} is selected. Type the number you want dialed.
          </li>
          <li>
            Optionally fill the recipient name + dynamic variables — they get
            substituted into {meta.label}'s prompt at runtime.
          </li>
          <li>Voxaris dispatches the agent and dials out instantly.</li>
          <li>
            On answer Andie opens with the required recording disclosure,
            confirms the member's identity (enrollment date + email on file),
            asks one or two questions about upcoming travel plans, and
            warm-transfers to a GVR closer with that context already loaded in.
          </li>
          <li>
            Track the call live in{" "}
            <a
              href={`/dashboard/calls?agent=${agent}`}
              className="text-cyan-300 underline"
            >
              {meta.label}'s recent calls
            </a>
            .
          </li>
        </ol>
      </section>
    </main>
  );
}
