// /cassie-demo — public landing page guests hit when they scan the
// Cassie demo QR code (Holiday Inn Club Vacations × Arrivia VBA).
// Same eligibility flow as /demo (Andie/Deedy) but HICV-themed:
// HICV-green header, Family Play Pass hero card, HICV wordmark.
//
// Eligible (yes)  → tel:CASSIE_NUMBER triggers the native call dialog
//                   on the guest's phone, dialing Cassie at HICV.
// Ineligible (no) → graceful "have a great vacation" close.

import { CassieEligibilityCard } from "./CassieEligibilityCard";
import Image from "next/image";
import { existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-static";

// Cassie's public inbound LK Phone Number for HICV.
// Hard-coded — printed QR codes can't be updated dynamically.
const CASSIE_NUMBER = "+14072586840";

// HICV brand mark — drop the official SVG into public/logo/hicv.svg
// and this header switches from the styled wordmark to the real logo
// automatically on next deploy. See public/logo/README-hicv.md.
const HICV_LOGO_PATH = "/logo/hicv.svg";
const hicvLogoExists = existsSync(
  join(process.cwd(), "public", "logo", "hicv.svg"),
);

export const metadata = {
  title: "Holiday Inn Club Vacations · Family Play Pass",
  description:
    "Check your eligibility for the Family Play Pass — $125 in resort activity credit when you take a quick ninety-minute look at the property.",
};

// HICV brand palette
const HICV_GREEN = "#00703C";
const HICV_GREEN_DARK = "#004D29";

export default function CassieDemoPage() {
  return (
    <main
      className="flex min-h-screen w-full flex-col bg-gradient-to-b text-neutral-900"
      style={{
        backgroundImage: `linear-gradient(to bottom, ${HICV_GREEN}, ${HICV_GREEN}, ${HICV_GREEN_DARK})`,
      }}
    >
      {/* Header — HICV wordmark (or official logo if hicv.svg is dropped) */}
      <header className="flex w-full justify-center pt-10 pb-8">
        {hicvLogoExists ? (
          <Image
            src={HICV_LOGO_PATH}
            alt="Holiday Inn Club Vacations"
            width={220}
            height={56}
            priority
            className="h-12 w-auto brightness-0 invert"
          />
        ) : (
          // Wordmark fallback — replaced automatically when hicv.svg is added
          <div className="flex flex-col items-center text-white">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] opacity-90">
              Holiday Inn
            </span>
            <span className="text-2xl font-extrabold uppercase tracking-tight">
              Club Vacations
            </span>
          </div>
        )}
      </header>

      {/* Card */}
      <div className="flex flex-1 items-start justify-center px-4 pb-10">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <CassieEligibilityCard cassieNumber={CASSIE_NUMBER} />
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-6 pb-6 text-[11px] text-white/80">
        <span>AI-Powered · Powered by Arrivia × Voxaris</span>
        <a
          href="https://arrivia.com"
          className="hover:text-white"
          target="_blank"
          rel="noreferrer"
        >
          arrivia.com
        </a>
      </footer>
    </main>
  );
}
