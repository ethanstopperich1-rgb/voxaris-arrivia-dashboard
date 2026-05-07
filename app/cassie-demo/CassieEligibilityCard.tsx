// Cassie / HICV eligibility card — three states:
//   1. greeting + Family Play Pass hook + 18+ question + consent + CTA
//   2. ineligible (NO) — graceful close, "have a great vacation"
//   3. eligible (YES + checked + tapped CTA) — tel: link auto-dials
//      Cassie at +1 407 258 6840 (native iOS/Android call dialog)
//
// Mirrors /demo/DemoEligibilityCard.tsx (Deedy/Andie) but with HICV
// brand accent (green) on the Family Play Pass card and updated copy
// pointing to the canonical OPC v2.0 flow Cassie runs on the call.
"use client";

import { useState } from "react";
import { Check, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Choice = null | "yes" | "no";

// HICV brand greens — used for the Play Pass hero block accent.
const HICV_GREEN = "#00703C";
const HICV_ORANGE = "#E64A19";

export function CassieEligibilityCard({
  cassieNumber,
}: {
  cassieNumber: string;
}) {
  const [choice, setChoice] = useState<Choice>(null);
  const [consent, setConsent] = useState(true);

  // INELIGIBLE STATE — under 18
  if (choice === "no") {
    return (
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <p className="text-lg font-bold uppercase tracking-wide text-[#002D5D]">
          Thanks for your interest!
        </p>
        <p className="mt-6 text-base leading-relaxed text-neutral-700">
          Unfortunately, you must be{" "}
          <span className="font-bold text-neutral-900">
            18 years of age or older
          </span>{" "}
          to be eligible for this offer.
        </p>
        <p className="mt-4 text-base leading-relaxed text-neutral-700">
          We hope you enjoy your stay at Holiday Inn Club Vacations and have
          a wonderful trip!
        </p>
        <button
          type="button"
          onClick={() => setChoice(null)}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-md border-2 border-[#00A0AF] px-6 py-3 text-sm font-semibold uppercase tracking-wider text-[#00A0AF] transition hover:bg-[#00A0AF] hover:text-white"
        >
          <Check className="h-4 w-4" />
          Have a great vacation!
        </button>
      </div>
    );
  }

  // DEFAULT STATE — Family Play Pass hook + eligibility + CTA
  const canSubmit = choice === "yes" && consent;

  return (
    <div className="flex flex-col px-6 py-8">
      {/* HICV-accent Play Pass hero — visually anchors the offer */}
      <div
        className="rounded-xl px-5 py-4 text-center text-white shadow-md"
        style={{ backgroundColor: HICV_GREEN }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest opacity-90">
          Holiday Inn Club Vacations
        </p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight">
          Family Play Pass
        </p>
        <p
          className="mt-1 text-3xl font-black"
          style={{ color: HICV_ORANGE }}
        >
          $125
        </p>
        <p className="text-[11px] font-medium uppercase tracking-wider opacity-90">
          in resort activity credit · up to 5 people · up to 5 days
        </p>
      </div>

      {/* Greeting */}
      <p className="mt-6 text-center text-base font-bold uppercase tracking-wide text-[#002D5D]">
        Claim your Family Play Pass
      </p>
      <p className="mt-1 text-center text-sm text-neutral-500">
        A quick eligibility check, then we&apos;ll connect you with Cassie.
      </p>

      <div className="mt-6 border-t border-neutral-200 pt-6">
        <p className="text-center text-base font-bold uppercase tracking-wide text-neutral-900">
          Eligibility Check
        </p>
        <p className="mt-2 text-center text-xs text-neutral-500">
          Please confirm the following to continue
        </p>

        {/* 18+ question */}
        <p className="mt-6 text-center text-base text-neutral-800">
          Are you{" "}
          <span className="font-semibold">18 years of age or older?</span>
        </p>

        {/* YES / NO buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setChoice("yes")}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-md border-2 py-3 text-sm font-semibold uppercase tracking-wider transition",
              choice === "yes"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50",
            )}
          >
            <Check className="h-4 w-4" />
            Yes
          </button>
          <button
            type="button"
            onClick={() => setChoice("no")}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-md border-2 py-3 text-sm font-semibold uppercase tracking-wider transition",
              "border-rose-500 bg-white text-rose-600 hover:bg-rose-50",
            )}
          >
            <X className="h-4 w-4" />
            No
          </button>
        </div>

        {/* Consent checkbox */}
        <label className="mt-5 flex cursor-pointer items-start gap-2 text-xs leading-snug text-neutral-700">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-neutral-400 accent-[#00A0AF]"
          />
          <span>
            I consent to be contacted about this offer via automated call
            or text. Recorded for quality and assurance purposes.
          </span>
        </label>

        {/* CTA — tel: link triggers native iOS/Android call dialog */}
        <a
          href={canSubmit ? `tel:${cassieNumber}` : undefined}
          onClick={(e) => {
            if (!canSubmit) e.preventDefault();
          }}
          aria-disabled={!canSubmit}
          className={cn(
            "mt-5 flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold uppercase tracking-wider transition",
            canSubmit
              ? "text-white hover:opacity-90"
              : "cursor-not-allowed bg-neutral-200 text-neutral-400",
          )}
          style={canSubmit ? { backgroundColor: HICV_GREEN } : undefined}
        >
          Talk to Cassie
          <ArrowRight className="h-4 w-4" />
        </a>

        {/* Talking-points microcopy — sets expectations before the dial */}
        <p className="mt-3 text-center text-[11px] leading-snug text-neutral-500">
          Cassie is an AI booking agent. She&apos;ll qualify you and book your
          ninety-minute resort preview right on the call. The $75 reservation
          deposit goes on your folio and comes off when you arrive.
        </p>

        {/* TCPA / legal disclaimer — same as /demo */}
        <p className="mt-6 text-[9px] leading-relaxed text-neutral-500">
          THIS ADVERTISING MATERIAL IS BEING USED FOR THE PURPOSE OF
          SOLICITING SALES OF TIMESHARE INTERESTS. NO PURCHASE REQUIRED.
          MUST BE 18 OR OLDER. FOR INDIVIDUAL RESORT GUESTS ONLY. FL DEPT
          OF BUSINESS &amp; PROFESSIONAL REGULATION ID 12-15.
        </p>
      </div>
    </div>
  );
}
