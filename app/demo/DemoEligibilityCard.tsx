// Eligibility card — three states:
//   1. greeting + 18-plus question + consent checkbox + CTA
//   2. ineligible (NO) — graceful close, "have a great vacation"
//   3. eligible (YES + checked + tapped CTA) — tel: link auto-dials
//      Deedy on the guest's phone (native iOS/Android call dialog)
//
// Designed mobile-first since this is what guests see when they scan
// the resort QR code. Renders fine on desktop too for the demo.
"use client";

import { useState } from "react";
import { Check, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Choice = null | "yes" | "no";

export function DemoEligibilityCard({ deedyNumber }: { deedyNumber: string }) {
  const [choice, setChoice] = useState<Choice>(null);
  const [consent, setConsent] = useState(true);

  // INELIGIBLE STATE — under 18
  if (choice === "no") {
    return (
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <p className="text-lg font-bold uppercase tracking-wide text-[#0891b2]">
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
          We hope you enjoy your stay and have a wonderful vacation!
        </p>
        <button
          type="button"
          onClick={() => setChoice(null)}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-md border-2 border-[#0891b2] px-6 py-3 text-sm font-semibold uppercase tracking-wider text-[#0891b2] transition hover:bg-[#0891b2] hover:text-white"
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
    <div className="flex flex-col px-6 py-8">
      {/* Greeting */}
      <p className="text-center text-lg font-bold uppercase tracking-wide text-[#0891b2]">
        Thanks for contacting us!
      </p>
      <p className="mt-1 text-center text-sm text-neutral-500">
        Let&apos;s get started.
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
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-neutral-400 accent-[#0891b2]"
          />
          <span>
            I consent to be contacted about this offer via automated call
            or text.
          </span>
        </label>

        {/* CTA — tel: link triggers native iOS/Android call dialog */}
        <a
          href={canSubmit ? `tel:${deedyNumber}` : undefined}
          onClick={(e) => {
            if (!canSubmit) e.preventDefault();
          }}
          aria-disabled={!canSubmit}
          className={cn(
            "mt-5 flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold uppercase tracking-wider transition",
            canSubmit
              ? "bg-[#0891b2] text-white hover:bg-[#0e7490]"
              : "cursor-not-allowed bg-neutral-200 text-neutral-400",
          )}
        >
          Check My Eligibility
          <ArrowRight className="h-4 w-4" />
        </a>

        {/* TCPA / legal disclaimer */}
        <p className="mt-6 text-[9px] leading-relaxed text-neutral-500">
          THIS ADVERTISING MATERIAL IS BEING USED FOR THE PURPOSE OF
          SOLICITING SALES OF TIMESHARE INTERESTS. NO PURCHASE REQUIRED.
          NOT 18 OR OLDER, FOR INDIVIDUALS RESORT GUESTS ONLY. R. DEPT
          OF BUSINESS &amp; PROFESSIONAL REGULATION ID 12-15.
        </p>
      </div>
    </div>
  );
}
