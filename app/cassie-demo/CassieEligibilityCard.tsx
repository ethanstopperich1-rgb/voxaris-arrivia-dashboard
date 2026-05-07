// HICV-aesthetic eligibility card — three states, hospitality-warm palette:
//   1. Family Play Pass anchor + 18+ question + consent + orange CTA
//   2. ineligible (NO) — graceful close, "have a great vacation"
//   3. eligible (YES + checked + tapped CTA) — tel: link auto-dials
//      Cassie on the guest's phone (native iOS/Android call dialog)
//
// Brand: matches hicv.com — white card, orange accents, neutral text.
// No green-block enterprise vibe. No screaming hero blocks. Clean form.
"use client";

import { useState } from "react";
import { Check, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Choice = null | "yes" | "no";

// HICV brand palette
const HICV_ORANGE = "#E64A19";
const HICV_ORANGE_HOVER = "#B8331A";

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
        <p
          className="text-lg font-bold uppercase tracking-wide"
          style={{ color: HICV_ORANGE }}
        >
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
          We hope you enjoy your stay at Holiday Inn Club Vacations and
          have a wonderful trip!
        </p>
        <button
          type="button"
          onClick={() => setChoice(null)}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full border-2 px-6 py-3 text-sm font-semibold uppercase tracking-wider transition hover:text-white"
          style={{
            borderColor: HICV_ORANGE,
            color: HICV_ORANGE,
          }}
        >
          <Check className="h-4 w-4" />
          Have a great vacation!
        </button>
      </div>
    );
  }

  // DEFAULT STATE — eligibility check + CTA
  const canSubmit = choice === "yes" && consent;

  return (
    <div className="flex flex-col px-6 py-8 md:px-8">
      {/* Top label — sets context without screaming */}
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
        Family Play Pass · Eligibility
      </p>

      <h2 className="mt-2 text-center text-2xl font-extrabold leading-tight text-neutral-900">
        Let&apos;s get you set up.
      </h2>
      <p className="mt-2 text-center text-sm text-neutral-600">
        A quick check, then we&apos;ll connect you with Cassie to lock in your
        time.
      </p>

      <div className="mt-8 border-t border-neutral-200 pt-6">
        {/* 18+ question */}
        <p className="text-center text-base font-medium text-neutral-800">
          Are you{" "}
          <span className="font-bold">18 years of age or older?</span>
        </p>

        {/* YES / NO buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setChoice("yes")}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-full border-2 py-3 text-sm font-semibold uppercase tracking-wider transition",
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
              "inline-flex items-center justify-center gap-2 rounded-full border-2 py-3 text-sm font-semibold uppercase tracking-wider transition",
              "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50",
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
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-neutral-400"
            style={{ accentColor: HICV_ORANGE }}
          />
          <span>
            I consent to be contacted about this offer via automated call
            or text. Recorded for quality and assurance purposes.
          </span>
        </label>

        {/* CTA — orange pill matching hicv.com "See Offer Details" */}
        <a
          href={canSubmit ? `tel:${cassieNumber}` : undefined}
          onClick={(e) => {
            if (!canSubmit) e.preventDefault();
          }}
          aria-disabled={!canSubmit}
          className={cn(
            "mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold uppercase tracking-wider shadow-md transition",
            canSubmit
              ? "text-white hover:shadow-lg"
              : "cursor-not-allowed bg-neutral-200 text-neutral-400 shadow-none",
          )}
          style={canSubmit ? { backgroundColor: HICV_ORANGE } : undefined}
          onMouseEnter={(e) => {
            if (canSubmit) {
              (e.target as HTMLElement).style.backgroundColor =
                HICV_ORANGE_HOVER;
            }
          }}
          onMouseLeave={(e) => {
            if (canSubmit) {
              (e.target as HTMLElement).style.backgroundColor = HICV_ORANGE;
            }
          }}
        >
          Talk to Cassie
          <ArrowRight className="h-4 w-4" />
        </a>

        {/* Microcopy — sets expectations before the dial */}
        <p className="mt-4 text-center text-[11px] leading-snug text-neutral-500">
          Cassie is an AI booking agent. She&apos;ll qualify you and book your
          ninety-minute resort preview right on the call. The $75 reservation
          deposit goes on your folio and comes off when you arrive.
        </p>

        {/* TCPA / legal disclaimer */}
        <p className="mt-6 border-t border-neutral-100 pt-4 text-[9px] leading-relaxed text-neutral-400">
          THIS ADVERTISING MATERIAL IS BEING USED FOR THE PURPOSE OF
          SOLICITING SALES OF TIMESHARE INTERESTS. NO PURCHASE REQUIRED.
          MUST BE 18 OR OLDER. FOR INDIVIDUAL RESORT GUESTS ONLY. FL DEPT
          OF BUSINESS &amp; PROFESSIONAL REGULATION ID 12-15.
        </p>
      </div>
    </div>
  );
}
