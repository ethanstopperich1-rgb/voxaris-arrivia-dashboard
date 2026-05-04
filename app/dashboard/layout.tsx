// Dashboard shell — wraps every /dashboard/* route with the sidebar nav
// and a full-page grid-pattern background (dillionverma/grid-pattern via
// 21st.dev). The pattern is masked with a vertical linear gradient so
// it's strongest at the top of the page and fades smoothly into the
// neutral-950 ground further down — never competes with content.
import { Sidebar } from "@/components/ui/modern-side-bar";
import { GridPattern } from "@/components/ui/grid-pattern";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-neutral-950 text-neutral-100">
      <Sidebar />
      <div className="relative flex-1 overflow-hidden">
        {/* Full-page grid pattern, fades top → bottom */}
        <GridPattern
          width={56}
          height={56}
          x={-1}
          y={-1}
          strokeDasharray="2 4"
          className={cn(
            "[mask-image:linear-gradient(to_bottom,white_5%,white_25%,transparent_85%)]",
            "absolute inset-0 h-full w-full",
          )}
        />
        {/* Subtle radial highlight at top-right for depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-0 h-[420px] w-[520px] rounded-full bg-cyan-500/[0.08] blur-3xl"
        />
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}
