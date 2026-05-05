// /demo — public landing page guests hit when they scan the demo QR
// code at the resort. NOT auth-gated (middleware only covers
// /dashboard/*). Uses the official Arrivia brand palette pulled
// directly from public/logo/arrivia.svg:
//
//   navy   #002D5D  — primary, header bg + headings
//   teal   #00A0AF  — accent, CTA button
//   teal2  #8FDADE  — pale teal, decorative
//
// Eligible (yes)  → tel:DEEDY_NUMBER triggers the native call dialog
//                   on the guest's phone, dialing Deedy.
// Ineligible (no) → graceful "have a great vacation" close.

import { DemoEligibilityCard } from "./DemoEligibilityCard";
import Image from "next/image";

export const dynamic = "force-static";

// Deedy's public inbound LK Phone Number. Hard-coded — printed QR
// codes can't be updated dynamically.
const DEEDY_NUMBER = "+14072586810";

export const metadata = {
  title: "Arrivia · Eligibility Check",
  description:
    "Check your eligibility for the resort preview offer with Arrivia.",
};

export default function DemoPage() {
  return (
    <main className="flex min-h-screen w-full flex-col bg-gradient-to-b from-[#002D5D] via-[#002D5D] to-[#001f43] text-neutral-900">
      {/* Header — Arrivia wordmark inverted to white over navy */}
      <header className="flex w-full justify-center pt-10 pb-8">
        <Image
          src="/logo/arrivia.svg"
          alt="Arrivia"
          width={200}
          height={56}
          priority
          className="h-12 w-auto brightness-0 invert"
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
