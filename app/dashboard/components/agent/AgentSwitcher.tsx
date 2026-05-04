// Top-of-page agent switcher: [Deedy] [Andie]. Client component so the
// active state can preserve scroll position when toggling. Each tab is
// just a Link that bumps the `agent` query param — the parent page
// re-renders with the corresponding agent's data.
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

export function AgentSwitcher({ active }: { active: "deedy" | "andie" }) {
  const pathname = usePathname() || "/dashboard";
  const params = useSearchParams();

  function hrefFor(slug: string) {
    const next = new URLSearchParams(params?.toString() ?? "");
    next.set("agent", slug);
    return `${pathname}?${next.toString()}`;
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-1">
      {AGENTS.map((a) => {
        const isActive = a.slug === active;
        return (
          <Link
            key={a.slug}
            // typed-routes can't statically prove a query-string href; we
            // build it from a known pathname so the cast is safe.
            href={hrefFor(a.slug) as never}
            scroll={false}
            className={cn(
              "group relative flex flex-col items-start rounded-xl px-5 py-2.5 transition",
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
            {isActive && (
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-3 bottom-1 h-px bg-gradient-to-r",
                  a.accent,
                )}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
