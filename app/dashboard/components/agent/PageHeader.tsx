// Standard page header used across every agent-segregated dashboard
// page (calendar, calls, queue, ops, outbound). Keeps the title +
// subtitle on the left and the agent switcher on the right so the
// user can swap views without going back to /dashboard first.

import { Suspense } from "react";
import { AgentSwitcher } from "./AgentSwitcher";
import type { AgentSlug } from "@/lib/dashboard/agent";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  agent: AgentSlug;
};

export function PageHeader({ eyebrow, title, subtitle, agent }: Props) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && (
          <p className="text-xs uppercase tracking-widest text-cyan-400">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-semibold text-neutral-100">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>
        )}
      </div>
      <Suspense fallback={null}>
        <AgentSwitcher active={agent} />
      </Suspense>
    </header>
  );
}
