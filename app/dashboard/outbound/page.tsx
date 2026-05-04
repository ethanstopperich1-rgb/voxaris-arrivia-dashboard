// Outbound dialer page — agent is locked by the top-of-page switcher,
// the form just collects phone + name + dynamic-variable overrides
// before dispatching the call.
//
// Deedy is INBOUND-ONLY (after-hours QR-scan booking flow — guests
// always dial in, she never dials out). If someone lands on
// /dashboard/outbound?agent=deedy we render an explainer instead of
// the dial form.

import { OutboundCallForm } from "./OutboundCallForm";
import { PageHeader } from "../components/agent/PageHeader";
import { resolveAgent, agentMeta, dbAgentName } from "@/lib/dashboard/agent";
import { PhoneOff } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OutboundPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>;
}) {
  const sp = await searchParams;
  const agent = resolveAgent(sp);
  const meta = agentMeta(agent);

  // Deedy is inbound-only — show a friendly explainer, not the form.
  if (agent === "deedy") {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
        <PageHeader
          eyebrow="VOXARIS · DEEDY · OUTBOUND"
          title="Deedy doesn't make outbound calls"
          subtitle="Deedy is the after-hours inbound booking agent — guests dial her after scanning a QR code at the resort. She never cold-calls."
          agent={agent}
        />
        <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-6">
          <div className="flex items-start gap-4">
            <PhoneOff className="mt-1 h-5 w-5 flex-shrink-0 text-cyan-400" />
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                Inbound only — by design
              </h2>
              <p className="mt-2 text-sm text-neutral-400">
                Deedy's job is to qualify and book guests who actively scan
                a QR code at the property. Cold-calling is out of scope:
              </p>
              <ul className="mt-3 ml-4 list-disc space-y-1 text-sm text-neutral-400">
                <li>The QR scan is the consent + intent signal</li>
                <li>No DNC/TCPA exposure (guest initiated the contact)</li>
                <li>No outbound caller-ID asymmetry to manage</li>
              </ul>
              <p className="mt-3 text-sm text-neutral-400">
                Outbound campaigns belong to <a
                  href="/dashboard/outbound?agent=andie"
                  className="text-cyan-300 underline"
                >Andie</a>{" "}
                (GVR member re-engagement). Switch to her tab above or
                use that link.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const dbAgent = dbAgentName(agent) as "andie-gvr";

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
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
            {meta.label} is selected. Type the number you want dialed.
          </li>
          <li>
            Optionally fill the recipient name + dynamic variables — they get
            substituted into {meta.label}'s prompt at runtime.
          </li>
          <li>Voxaris dispatches the agent and dials out instantly.</li>
          <li>
            On answer Andie greets, runs discovery, walks through the four
            benefit pillars, and either warm-transfers to a specialist or
            sends a Microsoft Bookings link.
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
