import type { ReactNode } from "react";
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "ok" | "warn" | "bad" | "info" }) {
  const cls = {
    neutral: "bg-neutral-800 text-neutral-300",
    ok: "bg-emerald-900/40 text-emerald-300",
    warn: "bg-amber-900/40 text-amber-300",
    bad: "bg-red-900/40 text-red-300",
    info: "bg-cyan-900/40 text-cyan-300",
  }[tone];
  return <span className={`inline-block rounded px-2 py-0.5 text-xs ${cls}`}>{children}</span>;
}
