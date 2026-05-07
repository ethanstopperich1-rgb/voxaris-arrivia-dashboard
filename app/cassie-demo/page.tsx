// /cassie-demo — public landing page guests hit when they scan the
// Cassie demo QR code (Holiday Inn Club Vacations × Arrivia VBA).
// Aesthetic mirrors hicv.com: white nav, big lifestyle photo hero
// with overlay copy, orange CTAs, hospitality-warm vibe.
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

// Brand-asset slots — drop the real files into public/ and the page
// auto-detects + uses them on next deploy.
const HICV_LOGO_PATH = "/logo/hicv.svg";
const HERO_PHOTO_PATH = "/cassie-demo/hero.jpg";

const hicvLogoExists = existsSync(
  join(process.cwd(), "public", "logo", "hicv.svg"),
);
const heroPhotoExists = existsSync(
  join(process.cwd(), "public", "cassie-demo", "hero.jpg"),
);

export const metadata = {
  title: "Holiday Inn Club Vacations · Family Play Pass",
  description:
    "Up to $125 in resort activity credit — on us. Up to five people, up to five days. Take a quick ninety-minute look at the property and the Play Pass is yours.",
};

// HICV brand palette
const HICV_ORANGE = "#E64A19";
const HICV_ORANGE_DARK = "#B8331A";

export default function CassieDemoPage() {
  return (
    <main className="flex min-h-screen w-full flex-col bg-white text-neutral-900">
      {/* ─── HEADER (matches hicv.com — white, slim, logo left) ─────────── */}
      <header className="flex w-full items-center justify-between border-b border-neutral-200 px-6 py-4 md:px-10">
        {hicvLogoExists ? (
          <Image
            src={HICV_LOGO_PATH}
            alt="Holiday Inn Club Vacations"
            width={180}
            height={48}
            priority
            className="h-10 w-auto"
          />
        ) : (
          <div className="flex flex-col leading-tight">
            <span
              className="text-base font-extrabold italic"
              style={{ color: HICV_ORANGE }}
            >
              Holiday Inn
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700">
              Club Vacations
            </span>
          </div>
        )}
        <span
          className="hidden text-sm font-semibold md:block"
          style={{ color: HICV_ORANGE }}
        >
          Member Login
        </span>
      </header>

      {/* ─── HERO (full-width photo, overlay copy, orange CTA pill) ──────── */}
      <section
        className="relative w-full overflow-hidden"
        style={{
          minHeight: "440px",
          backgroundImage: heroPhotoExists
            ? `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.45)), url(${HERO_PHOTO_PATH})`
            : `linear-gradient(135deg, #F5A36C 0%, ${HICV_ORANGE} 50%, ${HICV_ORANGE_DARK} 100%)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="mx-auto flex max-w-5xl flex-col justify-center px-6 py-20 text-white md:py-28">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Up To $125 In Activities
            <span className="block font-light italic opacity-90">— on us.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base font-medium md:text-xl">
            Claim your Family Play Pass — up to five people, up to five days,
            at any participating Holiday Inn Club Vacations resort.
          </p>
          <a
            href="#eligibility"
            className="mt-8 inline-flex w-fit items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:opacity-90"
            style={{ backgroundColor: HICV_ORANGE }}
          >
            See Offer Details
          </a>
        </div>
      </section>

      {/* ─── ELIGIBILITY CARD SECTION (warm cream background) ──────────── */}
      <section id="eligibility" className="bg-[#FAF6F2] px-4 py-12 md:py-16">
        <div className="mx-auto w-full max-w-md rounded-2xl bg-white shadow-xl">
          <CassieEligibilityCard cassieNumber={CASSIE_NUMBER} />
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-200 bg-white px-6 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 text-xs text-neutral-500 md:flex-row">
          <span>
            AI-Powered ·{" "}
            <a
              href="https://arrivia.com"
              className="hover:text-neutral-800"
              target="_blank"
              rel="noreferrer"
            >
              Arrivia
            </a>{" "}
            ×{" "}
            <a
              href="https://voxaris.io"
              className="hover:text-neutral-800"
              target="_blank"
              rel="noreferrer"
            >
              Voxaris
            </a>
          </span>
          <span>© Holiday Inn Club Vacations · All rights reserved</span>
        </div>
      </footer>
    </main>
  );
}
