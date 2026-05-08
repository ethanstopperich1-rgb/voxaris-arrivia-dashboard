// SMS opt-in / consent disclosure. Linked from the Twilio toll-free
// verification application as the "opt-in policy proof" URL. Twilio
// reviewers click this — keep the language plain and the workflow
// unambiguous so the campaign clears review on the first pass.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SMS Opt-In Policy · Voxaris for Arrivia",
  description:
    "How recipients consent to receive SMS from Voxaris's AI scheduling assistant operating on behalf of Arrivia / Westgate Lakes Resort & Spa.",
};

export default function SmsOptInPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-neutral-200">
      <p className="mb-2 text-xs uppercase tracking-widest text-cyan-400">
        Voxaris for Arrivia · Westgate Lakes pilot
      </p>
      <h1 className="mb-6 text-3xl font-semibold text-white">
        SMS Opt-In Policy
      </h1>

      <p className="mb-6 text-neutral-300">
        Voxaris operates an AI-assisted appointment scheduling assistant
        (&quot;Deedy&quot;) on behalf of Arrivia and its hospitality partner
        Westgate Lakes Resort &amp; Spa. This page describes exactly how a
        consumer consents to receive text messages from us, what we send, and
        how to stop.
      </p>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        How consumers opt in
      </h2>
      <p className="mb-3 text-neutral-300">
        Consent is collected <strong>verbally</strong>, on a recorded phone
        call, before any message is sent. The exact workflow:
      </p>
      <ol className="mb-6 list-decimal space-y-2 pl-6 text-neutral-300">
        <li>
          A consumer either calls our published number or scans a QR code at a
          partner property and is connected to Deedy, our AI scheduling
          assistant. The call begins with a recorded disclosure that the call
          is recorded.
        </li>
        <li>
          During the call, the consumer voluntarily provides their mobile
          phone number in order to schedule an in-person appointment at the
          property.
        </li>
        <li>
          Deedy then reads the verbal consent disclosure below and only sends
          an SMS if the consumer answers <strong>&ldquo;yes&rdquo;</strong>.
        </li>
        <li>
          The verbal consent, the consumer&apos;s phone number, and a
          timestamp are written to our system of record alongside the call
          recording, which is retained per our privacy policy.
        </li>
      </ol>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        Verbal consent script
      </h2>
      <p className="mb-3 text-neutral-300">
        The exact script Deedy reads on the call before any text is sent:
      </p>
      <blockquote className="mb-4 rounded-md border-l-4 border-cyan-500/60 bg-neutral-900/60 p-5 text-neutral-200">
        <p className="mb-3">
          <strong>Deedy:</strong> &ldquo;As part of confirming your
          appointment with Westgate Lakes, we can send you an automated text
          message with the date, time, and location. You&apos;ll receive
          about one to three messages per appointment &mdash; a confirmation,
          an optional reschedule if you ask to move it, and a reminder before
          the visit.&rdquo;
        </p>
        <p className="mb-3">
          &ldquo;Message and data rates may apply, depending on your mobile
          phone service plan. You can reply HELP at any time for support, or
          STOP to opt out completely. Our SMS terms are at
          arrivia.voxaris.io/sms-terms and our privacy policy is at
          arrivia.voxaris.io/sms-privacy.&rdquo;
        </p>
        <p className="mb-3">
          &ldquo;Would you like me to text you the appointment details
          &mdash; yes or no?&rdquo;
        </p>
        <p className="mb-3">
          <strong>Customer:</strong> &ldquo;Yes please.&rdquo;
        </p>
        <p>
          <strong>Deedy:</strong> &ldquo;Great &mdash; I&apos;ll send the
          confirmation now.&rdquo;
        </p>
      </blockquote>
      <p className="mb-6 text-sm text-neutral-400">
        If the consumer answers &ldquo;no,&rdquo; declines, or does not give
        an affirmative answer, no SMS is sent and the refusal is logged. The
        consumer can later opt in by calling back and re-consenting on a
        future recorded call.
      </p>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        What we send
      </h2>
      <p className="mb-3 text-neutral-300">
        A single, narrow use case: transactional appointment notifications.
        Specifically:
      </p>
      <ul className="mb-6 list-disc space-y-2 pl-6 text-neutral-300">
        <li>Appointment confirmation with the date, time, and property name</li>
        <li>A reschedule link if the consumer asks to move the appointment</li>
        <li>A reminder shortly before the scheduled visit</li>
      </ul>
      <p className="mb-6 text-neutral-300">
        We do <strong>not</strong> send marketing, promotional, or
        third-party content from this number. We do not share or sell mobile
        numbers or opt-in data to third parties or affiliates for marketing
        purposes.
      </p>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        Sample message
      </h2>
      <pre className="mb-6 overflow-x-auto rounded-md border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-200">
{`Hi Alex, this is Deedy from Westgate Lakes confirming
your visit on Saturday May 9 at 10:30 AM. Reply C to
confirm, R to reschedule, or STOP to opt out.`}
      </pre>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">
        How to stop or get help
      </h2>
      <ul className="mb-6 list-disc space-y-2 pl-6 text-neutral-300">
        <li>
          Reply <strong>STOP</strong> to any message to be unsubscribed
          immediately. We will send one confirmation message and then no
          further messages from that number.
        </li>
        <li>
          Reply <strong>HELP</strong> to receive a message with our support
          contact information.
        </li>
        <li>
          Message and data rates may apply. Message frequency is low &mdash;
          typically one to three messages per scheduled appointment.
        </li>
      </ul>

      <h2 className="mt-10 mb-3 text-xl font-semibold text-white">Contact</h2>
      <p className="mb-12 text-neutral-300">
        Questions about this SMS program can be sent to{" "}
        <a
          href="mailto:support@voxaris.io"
          className="text-cyan-400 hover:underline"
        >
          support@voxaris.io
        </a>
        . See also our{" "}
        <a href="/sms-terms" className="text-cyan-400 hover:underline">
          SMS Terms &amp; Conditions
        </a>{" "}
        and{" "}
        <a href="/sms-privacy" className="text-cyan-400 hover:underline">
          Privacy Policy
        </a>
        .
      </p>

      <p className="text-xs text-neutral-500">
        Last updated: May 2026.
      </p>
    </main>
  );
}
