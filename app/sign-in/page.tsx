// /sign-in — branded sign-in. Glowing card (orbiting cyan dot) +
// border-beam on the form, full-page grid pattern background. Same
// aesthetic family as the live ops dashboard so it doesn't feel like
// a separate app.
import Image from "next/image";
import { GridPattern } from "@/components/ui/grid-pattern";
import { GlowingCard } from "@/components/ui/glowing-card";
import { BorderBeam } from "@/components/ui/border-beam";
import { cn } from "@/lib/utils";
import { SignInForm } from "./SignInForm";

export const dynamic = "force-static";

export const metadata = {
  title: "Sign in · Voxaris",
  description: "Sign in to the Voxaris live ops dashboard.",
};

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-neutral-950 px-6 text-neutral-100">
      {/* Decorative full-page grid */}
      <GridPattern
        width={56}
        height={56}
        x={-1}
        y={-1}
        strokeDasharray="2 4"
        className={cn(
          "[mask-image:radial-gradient(900px_circle_at_center,white_15%,transparent_75%)]",
          "absolute inset-0 h-full w-full",
        )}
      />
      {/* Soft cyan glow accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-1/4 h-[420px] w-[520px] rounded-full bg-cyan-500/[0.08] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-1/4 h-[320px] w-[420px] rounded-full bg-cyan-500/[0.05] blur-3xl"
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Voxaris hero logo — chrome SVG over deep black */}
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo/voxaris.svg"
            alt="Voxaris AI · Personalizing Your Outreach"
            width={420}
            height={126}
            priority
            className="w-full max-w-[320px] drop-shadow-[0_0_30px_rgba(34,211,238,0.18)]"
          />
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/80 p-6 backdrop-blur">
          {/* Co-brand strip — small, restrained, lives ABOVE the form.
              Arrivia wordmark on a white pill so brand colors
              (navy + teal) render properly against the dark card. */}
          <div className="mb-5 flex items-center justify-between border-b border-neutral-800/70 pb-4">
            <span className="text-[10px] font-medium uppercase tracking-widest text-cyan-300/80">
              Live Ops
            </span>
            <div className="inline-flex items-center justify-center rounded bg-white px-2 py-1 shadow-sm">
              <Image
                src="/logo/arrivia.svg"
                alt="Arrivia"
                width={90}
                height={20}
                className="h-4 w-auto"
              />
            </div>
          </div>
          <SignInForm />
          <BorderBeam size={180} duration={12} colorFrom="#22d3ee" colorTo="#06b6d4" />
        </div>

        <p className="mt-6 text-center text-[11px] text-neutral-500">
          Authorized personnel only. All sessions are logged.
        </p>
      </div>
    </div>
  );
}
