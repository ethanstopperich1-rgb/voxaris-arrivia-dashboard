// Glowing card with an orbiting accent dot. Built for the "Live Calls"
// KPI — the dot orbiting the border signals "this is live data, updating
// in real-time" without requiring text.
//
// The orbit-dot keyframe is registered in tailwind.config.ts
// (animation.orbit-dot + keyframes.orbit-dot).
"use client";

import { cn } from "@/lib/utils";

interface GlowingCardProps {
  /** Big number / label (left) */
  value: React.ReactNode;
  /** Subtitle under the value */
  label: string;
  /** Optional caption under the label, e.g. "live now" */
  caption?: string;
  className?: string;
  /** Extra class on the inner card surface */
  cardClassName?: string;
}

export function GlowingCard({
  value,
  label,
  caption,
  className,
  cardClassName,
}: GlowingCardProps) {
  return (
    <div
      className={cn(
        "relative isolate rounded-2xl p-px",
        // Outer gradient ring — sets the glow that the moving dot draws on top of.
        "bg-[radial-gradient(circle_at_top_right,theme(colors.cyan.500/0.5),theme(colors.cyan.500/0.05)_55%,transparent_75%)]",
        className,
      )}
    >
      {/* Orbiting accent dot — circles the outer ring */}
      <span
        aria-hidden
        className={cn(
          "absolute z-10 h-2.5 w-2.5 rounded-full",
          "bg-cyan-400 shadow-[0_0_18px_4px_rgba(34,211,238,0.7)]",
          "animate-orbit-dot",
        )}
      />

      {/* Card surface */}
      <div
        className={cn(
          "relative overflow-hidden rounded-[15px] bg-neutral-950/95 backdrop-blur",
          "border border-white/[0.04] p-5",
          "h-full",
          cardClassName,
        )}
      >
        {/* Subtle inner ray */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 -z-0 h-48 w-48 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl"
        />

        {/* Cross hairs at the corners */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-px w-1/3 bg-gradient-to-r from-cyan-400/60 to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-1/3 w-px bg-gradient-to-b from-cyan-400/60 to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 h-px w-1/3 bg-gradient-to-l from-cyan-400/60 to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-1/3 w-px bg-gradient-to-t from-cyan-400/60 to-transparent"
        />

        <div className="relative z-10 flex flex-col">
          <span className="text-[10px] font-medium uppercase tracking-widest text-cyan-300/80">
            {label}
          </span>
          <span className="mt-1 text-4xl font-semibold tabular-nums text-neutral-100 sm:text-5xl">
            {value}
          </span>
          {caption && (
            <span className="mt-2 text-xs text-neutral-400">{caption}</span>
          )}
        </div>
      </div>
    </div>
  );
}
