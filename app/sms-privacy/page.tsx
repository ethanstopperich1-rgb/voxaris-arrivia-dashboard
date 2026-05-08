// Privacy policy — linked from the Twilio toll-free verification
// application. Specifically scoped to the SMS program; broader Voxaris
// privacy considerations live in the master corporate privacy policy.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Voxaris for Arrivia",
  description:
    "Privacy practices for the SMS messaging program operated by Voxaris on behalf of Arrivia / Westgate Lakes.",
};

export default function SmsPrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-neutral-200">
      <p className="mb-2 text-xs uppercase tracking-widest text-cyan-400">
        Voxaris for Arrivia
      </p>
      <h1 className="mb-6 text-3xl font-semibold text-white">
        Privacy Policy &mdash; SMS Program
      </h1>

      <p className="mb-6 text-neutral-300">
        This policy describes how Voxaris collects, uses, and protects
        information in connection with the SMS appointment-notification
        program operated on behalf of Arrivia and its hospitality partner
        Westgate Lakes Resort &amp; Spa.
      </p>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        Information we collect
      </h2>
      <ul className="mb-6 list-disc space-y-2 pl-6 text-neutral-300">
        <li>
          <strong>Mobile phone number,</strong> provided verbally by the
          consumer during a recorded phone call with our AI scheduling
          assistant.
        </li>
        <li>
          <strong>Appointment metadata</strong> &mdash; date, time, property
          name, and consumer first name &mdash; provided during the call.
        </li>
        <li>
          <strong>Verbal consent record</strong> &mdash; the timestamp and
          call recording fragment in which the consumer agreed to receive
          text messages.
        </li>
        <li>
          <strong>Message delivery and reply data</strong> &mdash; standard
          carrier-level delivery receipts and any STOP / HELP / confirmation
          replies the consumer sends.
        </li>
      </ul>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        How we use information
      </h2>
      <ul className="mb-6 list-disc space-y-2 pl-6 text-neutral-300">
        <li>To send the appointment confirmations and reminders the consumer agreed to receive</li>
        <li>To process replies (confirm, reschedule, opt out)</li>
        <li>To maintain a record of consent and program activity for compliance</li>
        <li>To diagnose and improve service reliability</li>
      </ul>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        How we share information
      </h2>
      <p className="mb-3 text-neutral-300">
        We do <strong>not</strong> share or sell mobile numbers, opt-in
        records, or SMS content to third parties or affiliates for marketing
        purposes. We share information only with:
      </p>
      <ul className="mb-6 list-disc space-y-2 pl-6 text-neutral-300">
        <li>
          <strong>Telecom service providers</strong> (e.g. Twilio) that
          deliver the messages on our behalf.
        </li>
        <li>
          <strong>The hospitality partner</strong> (Westgate Lakes) that
          fulfills the in-person appointment, limited to the appointment
          metadata required to staff the visit.
        </li>
        <li>
          <strong>Government or law enforcement</strong> where required by
          law.
        </li>
      </ul>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        Retention
      </h2>
      <p className="mb-6 text-neutral-300">
        Phone numbers, consent records, and call recordings associated with
        the SMS program are retained for the duration of the active
        relationship and for a reasonable period thereafter to satisfy legal
        and compliance obligations. Consumers may request deletion at any
        time by emailing the address below; we will delete records except
        where retention is required by law.
      </p>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        Security
      </h2>
      <p className="mb-6 text-neutral-300">
        Phone numbers and call recordings are stored in encrypted-at-rest
        managed databases with access limited to authorized personnel.
        Transport between our systems and our telecom providers is
        TLS-encrypted.
      </p>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        Your choices
      </h2>
      <ul className="mb-6 list-disc space-y-2 pl-6 text-neutral-300">
        <li>
          Reply <strong>STOP</strong> to any SMS to opt out immediately.
        </li>
        <li>
          Email{" "}
          <a
            href="mailto:support@voxaris.io"
            className="text-cyan-400 hover:underline"
          >
            support@voxaris.io
          </a>{" "}
          to access, correct, or delete information we hold about you.
        </li>
      </ul>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        Contact
      </h2>
      <p className="mb-12 text-neutral-300">
        Questions:{" "}
        <a
          href="mailto:support@voxaris.io"
          className="text-cyan-400 hover:underline"
        >
          support@voxaris.io
        </a>
        . See also our{" "}
        <a href="/sms-opt-in" className="text-cyan-400 hover:underline">
          SMS Opt-In Policy
        </a>{" "}
        and{" "}
        <a href="/sms-terms" className="text-cyan-400 hover:underline">
          SMS Terms &amp; Conditions
        </a>
        .
      </p>

      <p className="text-xs text-neutral-500">Last updated: May 2026.</p>
    </main>
  );
}
