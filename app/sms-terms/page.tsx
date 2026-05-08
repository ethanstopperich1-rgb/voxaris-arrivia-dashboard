// SMS Terms & Conditions — linked from the Twilio toll-free verification
// application. Plain language, narrow scope (transactional appointment
// notifications), so reviewers can confirm the program matches the use
// case described in the campaign.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SMS Terms & Conditions · Voxaris for Arrivia",
  description:
    "Terms and conditions governing transactional SMS messages sent by Voxaris's AI scheduling assistant on behalf of Arrivia / Westgate Lakes.",
};

export default function SmsTermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-neutral-200">
      <p className="mb-2 text-xs uppercase tracking-widest text-cyan-400">
        Voxaris for Arrivia
      </p>
      <h1 className="mb-6 text-3xl font-semibold text-white">
        SMS Terms &amp; Conditions
      </h1>

      <p className="mb-6 text-neutral-300">
        These terms govern text messages sent by Voxaris on behalf of Arrivia
        and its hospitality partner Westgate Lakes Resort &amp; Spa
        (collectively, &ldquo;we&rdquo;). By verbally agreeing to receive
        text messages during a recorded phone call with our AI scheduling
        assistant, you consent to these terms.
      </p>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        Program description
      </h2>
      <p className="mb-6 text-neutral-300">
        This is a transactional messaging program. We send appointment
        confirmations, reschedule links, and pre-visit reminders to consumers
        who have verbally consented during a recorded phone call. We do not
        send marketing or promotional content from this number.
      </p>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        Message frequency
      </h2>
      <p className="mb-6 text-neutral-300">
        Message frequency is low and event-driven. A typical appointment
        results in one to three messages: an initial confirmation, an
        optional reschedule message if requested, and a reminder before the
        scheduled visit.
      </p>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        Message and data rates
      </h2>
      <p className="mb-6 text-neutral-300">
        Standard message and data rates from your wireless carrier may
        apply. We do not charge a fee for messages.
      </p>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        Opting out and getting help
      </h2>
      <p className="mb-3 text-neutral-300">
        You may opt out at any time:
      </p>
      <ul className="mb-6 list-disc space-y-2 pl-6 text-neutral-300">
        <li>
          Reply <strong>STOP</strong> to any message to be unsubscribed
          immediately. We will send a single confirmation that you have been
          unsubscribed and then no further messages.
        </li>
        <li>
          Reply <strong>HELP</strong> to receive support contact
          information.
        </li>
      </ul>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        Supported carriers
      </h2>
      <p className="mb-6 text-neutral-300">
        Available on major U.S. carriers including AT&amp;T, T-Mobile,
        Verizon, U.S. Cellular, and most regional carriers. Carriers are not
        liable for delayed or undelivered messages.
      </p>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        Privacy
      </h2>
      <p className="mb-6 text-neutral-300">
        Mobile phone numbers, opt-in records, and message content are
        handled per our{" "}
        <a href="/sms-privacy" className="text-cyan-400 hover:underline">
          Privacy Policy
        </a>
        . We do not share or sell mobile numbers or opt-in data to third
        parties or affiliates for marketing purposes.
      </p>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        Contact
      </h2>
      <p className="mb-12 text-neutral-300">
        Questions: <a href="mailto:support@voxaris.io" className="text-cyan-400 hover:underline">support@voxaris.io</a>. See also our{" "}
        <a href="/sms-opt-in" className="text-cyan-400 hover:underline">
          SMS Opt-In Policy
        </a>
        .
      </p>

      <p className="text-xs text-neutral-500">Last updated: May 2026.</p>
    </main>
  );
}
