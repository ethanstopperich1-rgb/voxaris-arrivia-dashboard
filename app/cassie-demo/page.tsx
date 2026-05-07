// /cassie-demo — public landing page guests hit when they scan the
// Cassie demo QR code (Holiday Inn Club Vacations × Arrivia VBA).
// Mirrors /demo (Andie/Deedy) shell with the same Arrivia palette but
// adds an HICV accent for the Family Play Pass offer card.
//
// Eligible (yes)  → tel:CASSIE_NUMBER triggers the native call dialog
//                   on the guest's phone, dialing Cassie at HICV.
// Ineligible (no) → graceful "have a great vacation" close.
//
// Cassie's canonical OPC v2.0 script handles the call from there:
// AI + recording disclosure, Family Play Pass hook, on-property gate,
// 4 soft-qual questions, 8 hard-qual checks, three-slot assumptive
// close, $75 folio deposit, SMS confirmation.

import { CassieEligibilityCard } from "./CassieEligibilityCard";
import Image from "next/image";

export const dynamic = "force-static";

// Cassie's public inbound LK Phone Number for HICV.
// Hard-coded — printed QR codes can't be updated dynamically.
const CASSIE_NUMBER = "+14072586840";

export const metadata = {
  title: "Holiday Inn Club Vacations · Family Play Pass",
  description:
    "Check your eligibility for the Family Play Pass — $125 in resort activity credit when you take a quick ninety-minute look at the property.",
};

export default function CassieDemoPage() {
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
          <CassieEligibilityCard cassieNumber={CASSIE_NUMBER} />
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-6 pb-6 text-[11px] text-white/70">
        <span>AI-Powered · Always On · Holiday Inn Club Vacations × Arrivia</span>
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
