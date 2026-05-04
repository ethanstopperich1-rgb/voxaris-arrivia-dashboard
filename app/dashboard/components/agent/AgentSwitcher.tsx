// Top-of-page agent switcher: [Deedy] [Andie]. Client component so the
// active state can preserve scroll position when toggling. Each tab is
// just a Link that bumps the `agent` query param — the parent page
// re-renders with the corresponding agent's data.
//
// `only` prop filters the visible agents. When only one agent is
// visible (e.g. Andie on outbound/queue pages where Deedy isn't
// applicable), we render a static label instead of a one-tab
// switcher.
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const AGENTS = [
  {
    slug: "deedy",
    label: "Deedy",
    sublabel: "Arrivia · Booking",
    accent: "from-cyan-400 to-cyan-300",
  },
  {
    slug: "andie",
    label: "Andie",
    sublabel: "GVR · Re-engagement",
    accent: "from-violet-400 to-fuchsia-300",
  },
] as const;

type AgentSlug = (typeof AGENTS)[number]["slug"];

export function AgentSwitcher({
  active,
  only,
}: {
  active: AgentSlug;
  only?: readonly AgentSlug[];
}) {
  // Hooks must run unconditionally on every render (rules of hooks).
  const pathname = usePathname() || "/dashboard";
  const params = useSearchParams();

  const visibleAgents = only
    ? AGENTS.filter((a) => only.includes(a.slug))
    : AGENTS;

  // Single-agent case: static badge, no tab strip.
  if (visibleAgents.length <= 1) {
    const a = visibleAgents[0];
    if (!a) return null;
    return (
      <div className="inline-flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/80 px-4 py-2.5">
        <span
          className={cn(
            "bg-gradient-to-r bg-clip-text text-sm font-semibold tracking-tight text-transparent",
            a.accent,
          )}
        >
          {a.label}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
          {a.sublabel}
        </span>
      </div>
    );
  }

  function hrefFor(slug: string) {
    const next = new URLSearchParams(params?.toString() ?? "");
    next.set("agent", slug);
    return `${pathname}?${next.toString()}`;
  }

  return (
    <div className="inline-flex w-full items-center gap-1 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/80 p-1 sm:w-auto">
      {visibleAgents.map((a) => {
        const isActive = a.slug === active;
        return (
          <Link
            key={a.slug}
            href={hrefFor(a.slug) as never}
            scroll={false}
            className={cn(
              "group relative flex flex-1 flex-col items-start rounded-xl px-3 py-2 transition sm:flex-none sm:px-5 sm:py-2.5",
              isActive
                ? "bg-neutral-900/80 ring-1 ring-neutral-800"
                : "hover:bg-neutral-900/40",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span
              className={cn(
                "text-sm font-semibold tracking-tight",
                isActive
                  ? "bg-gradient-to-r bg-clip-text text-transparent " + a.accent
                  : "text-neutral-300",
              )}
            >
              {a.label}
            </span>
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-widest",
                isActive ? "text-neutral-400" : "text-neutral-500",
              )}
            >
              {a.sublabel}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
