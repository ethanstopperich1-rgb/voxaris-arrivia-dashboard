// /demo — public landing page guests hit when they scan the demo QR
// code at the resort. NOT auth-gated (middleware only covers
// /dashboard/*). Mirrors the canonical Arrivia eligibility-check
// design: teal header with Arrivia wordmark + white card with the
// 18+ gate + a tap-to-call CTA that fires the actual phone dial on
// the guest's device.
//
// Eligible (yes)  → tel:DEEDY_NUMBER triggers the native iOS/Android
//                   call dialog with Deedy's inbound LK number.
// Ineligible (no) → graceful "we hope you enjoy your stay" close.
//
// Per-call dispatch metadata: when the guest taps the call button
// their phone dials Deedy directly. The dispatch rule routes the
// call to her, the dispatch metadata travels via the dialed number's
// PN binding, and Deedy answers with the after-hours opener.

import { DemoEligibilityCard } from "./DemoEligibilityCard";
import Image from "next/image";

export const dynamic = "force-static";

// Deedy's public inbound LK Phone Number. Hard-coded here because
// this is the customer-facing number, not an env-driven config —
// QR codes printed at the resort can't be updated dynamically.
const DEEDY_NUMBER = "+14072586810";

export const metadata = {
  title: "Arrivia · Eligibility Check",
  description:
    "Check your eligibility for the resort preview offer with Arrivia.",
};

export default function DemoPage() {
  return (
    <main className="flex min-h-screen w-full flex-col bg-gradient-to-b from-[#0891b2] via-[#0891b2] to-[#0e7490] text-neutral-900">
      {/* Header — Arrivia wordmark over teal */}
      <header className="flex w-full justify-center pt-10 pb-8">
        <Image
          src="/logo/arrivia.svg"
          alt="Arrivia"
          width={180}
          height={48}
          priority
          className="h-10 w-auto brightness-0 invert"
        />
      </header>

      {/* Card */}
      <div className="flex flex-1 items-start justify-center px-4 pb-10">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <DemoEligibilityCard deedyNumber={DEEDY_NUMBER} />
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-6 pb-6 text-[11px] text-white/70">
        <span>AI-Powered · Always On</span>
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
