import type { ReactNode } from "react";
export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-800">
      {title ? (
        <header className="border-b border-neutral-800 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-neutral-300">
          {title}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
