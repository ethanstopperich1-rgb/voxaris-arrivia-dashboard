// Outbound dialer page — pick an agent, type a phone, click Dial.
// The agent dials out and runs its conversation when the call connects.
import { OutboundCallForm } from "./OutboundCallForm";

export const dynamic = "force-dynamic";

export default function OutboundPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-8 py-12">
      <header>
        <p className="text-xs uppercase tracking-widest text-cyan-400">
          VOXARIS · OUTBOUND
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-neutral-100">
          Place an outbound call
        </h1>
        <p className="text-sm text-neutral-400">
          Dispatch Deedy or Andie to dial a number. The agent runs its full
          conversation flow the moment the recipient picks up.
        </p>
      </header>

      <OutboundCallForm />

      <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-200">How it works</h2>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-neutral-400">
          <li>Pick the agent and number, optionally pass the recipient&apos;s name for personalized greeting.</li>
          <li>Voxaris dispatches the agent and dials out instantly.</li>
          <li>On answer the agent greets, qualifies, and uses its tools (booking, scheduler link, warm transfer).</li>
          <li>
            Track the call live in{" "}
            <a href="/dashboard/calls" className="text-cyan-300 underline">Recent Calls</a>{" "}
            — recording, transcript, and summary land automatically when the call ends.
          </li>
        </ol>
      </section>
    </main>
  );
}
