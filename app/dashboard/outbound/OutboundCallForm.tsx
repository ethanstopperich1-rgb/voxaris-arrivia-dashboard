"use client";

// Outbound dialer form. Surfaces every dynamic variable the agent
// personas reference at runtime, so the dispatch metadata is complete:
//
//   Deedy (deedy-vba) — Arrivia booking flow:
//     property_name, premium_offer, placement_name, placement_opener_hook,
//     caller_name, caller_first_name, slot_1, slot_2, on_property
//
//   Andie (andie-gvr) — GVR re-engagement flow:
//     member_name, member_first_name, incentive_amount,
//     transfer_bonus_amount, total_after_bonus, is_returning_caller,
//     last_call_date, booking_link_label
//
// Both agents also receive: direction=outbound, phone_number, plus the
// shared platform_brand / platform_brand_phonetic fields handled
// server-side.

import { useMemo, useState, useTransition } from "react";
import {
  Phone,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { startOutboundCall } from "./actions";

type Agent = "deedy-vba" | "andie-gvr";

type Result =
  | { kind: "idle" }
  | { kind: "ok"; room: string; dispatchId: string; agent: Agent; to: string }
  | { kind: "err"; message: string };

const AGENTS: { value: Agent; label: string; sub: string }[] = [
  {
    value: "deedy-vba",
    label: "Deedy",
    sub: "Virtual Booking Agent — resort preview qualification",
  },
  {
    value: "andie-gvr",
    label: "Andie",
    sub: "GVR member re-engagement guide",
  },
];

// Mirror the Python workers' DEFAULT_*_CONTEXT exactly.
const DEEDY_DEFAULTS = {
  property_name: "Westgate Lakes Resort & Spa",
  premium_offer: "complimentary three-night Orlando getaway",
  placement_name: "QR scan",
  placement_opener_hook: "",
  slot_1: "tomorrow morning",
  slot_2: "tomorrow afternoon",
  on_property: "unknown" as "yes" | "no" | "unknown",
};

const ANDIE_DEFAULTS = {
  incentive_amount: "$250",
  transfer_bonus_amount: "$250",
  total_after_bonus: "$500",
  is_returning_caller: "false" as "true" | "false",
  last_call_date: "never",
  booking_link_label: "your scheduling link",
  // Identity verification (used by verify_me_to_caller tool)
  domain: "",
  masked_email: "",
  masked_phone: "",
};

function normalizeE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return "+" + digits;
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return raw.startsWith("+") ? raw : `+${digits}`;
}

function firstNameOf(full: string): string {
  return full.trim().split(/\s+/)[0] ?? "";
}

export function OutboundCallForm() {
  const [agent, setAgent] = useState<Agent>("deedy-vba");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [advanced, setAdvanced] = useState(true);

  // Deedy fields
  const [propertyName, setPropertyName] = useState(DEEDY_DEFAULTS.property_name);
  const [premiumOffer, setPremiumOffer] = useState(DEEDY_DEFAULTS.premium_offer);
  const [placementName, setPlacementName] = useState(DEEDY_DEFAULTS.placement_name);
  const [placementHook, setPlacementHook] = useState(DEEDY_DEFAULTS.placement_opener_hook);
  const [slot1, setSlot1] = useState(DEEDY_DEFAULTS.slot_1);
  const [slot2, setSlot2] = useState(DEEDY_DEFAULTS.slot_2);
  const [onProperty, setOnProperty] = useState<"yes" | "no" | "unknown">(
    DEEDY_DEFAULTS.on_property,
  );

  // Andie fields
  const [incentiveAmount, setIncentiveAmount] = useState(
    ANDIE_DEFAULTS.incentive_amount,
  );
  const [transferBonus, setTransferBonus] = useState(
    ANDIE_DEFAULTS.transfer_bonus_amount,
  );
  const [totalAfterBonus, setTotalAfterBonus] = useState(
    ANDIE_DEFAULTS.total_after_bonus,
  );
  const [isReturning, setIsReturning] = useState<"true" | "false">(
    ANDIE_DEFAULTS.is_returning_caller,
  );
  const [lastCallDate, setLastCallDate] = useState(ANDIE_DEFAULTS.last_call_date);
  const [bookingLinkLabel, setBookingLinkLabel] = useState(
    ANDIE_DEFAULTS.booking_link_label,
  );
  const [domain, setDomain] = useState(ANDIE_DEFAULTS.domain);
  const [maskedEmail, setMaskedEmail] = useState(ANDIE_DEFAULTS.masked_email);
  const [maskedPhone, setMaskedPhone] = useState(ANDIE_DEFAULTS.masked_phone);

  const [result, setResult] = useState<Result>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  const buildMetadata = useMemo(() => {
    return (): Record<string, unknown> => {
      const first = firstNameOf(name);
      if (agent === "deedy-vba") {
        return {
          property_name: propertyName.trim() || DEEDY_DEFAULTS.property_name,
          premium_offer: premiumOffer.trim() || DEEDY_DEFAULTS.premium_offer,
          placement_name: placementName.trim() || DEEDY_DEFAULTS.placement_name,
          placement_opener_hook: placementHook.trim(),
          slot_1: slot1.trim() || DEEDY_DEFAULTS.slot_1,
          slot_2: slot2.trim() || DEEDY_DEFAULTS.slot_2,
          on_property: onProperty,
          // Mirrored shorthand the persona consumes
          incentive: premiumOffer.trim() || DEEDY_DEFAULTS.premium_offer,
          resort_name: propertyName.trim() || DEEDY_DEFAULTS.property_name,
          guest_stay_type: onProperty === "yes" ? "on_property" : "off_property",
          placement_location: placementName.trim() || DEEDY_DEFAULTS.placement_name,
          caller_first_name: first,
        };
      }
      return {
        member_name: name.trim() || "there",
        member_first_name: first,
        incentive_amount: incentiveAmount.trim() || ANDIE_DEFAULTS.incentive_amount,
        transfer_bonus_amount:
          transferBonus.trim() || ANDIE_DEFAULTS.transfer_bonus_amount,
        total_after_bonus:
          totalAfterBonus.trim() || ANDIE_DEFAULTS.total_after_bonus,
        is_returning_caller: isReturning,
        last_call_date: lastCallDate.trim() || ANDIE_DEFAULTS.last_call_date,
        booking_link_label:
          bookingLinkLabel.trim() || ANDIE_DEFAULTS.booking_link_label,
        // Identity verification context for verify_me_to_caller tool
        domain: domain.trim(),
        masked_email: maskedEmail.trim(),
        masked_phone: maskedPhone.trim(),
      };
    };
  }, [
    agent,
    name,
    propertyName,
    premiumOffer,
    placementName,
    placementHook,
    slot1,
    slot2,
    onProperty,
    incentiveAmount,
    transferBonus,
    totalAfterBonus,
    isReturning,
    lastCallDate,
    bookingLinkLabel,
    domain,
    maskedEmail,
    maskedPhone,
  ]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const to = normalizeE164(phone);
    if (!/^\+\d{10,15}$/.test(to)) {
      setResult({ kind: "err", message: "Phone must be a valid E.164 number." });
      return;
    }
    startTransition(async () => {
      const res = await startOutboundCall({
        to,
        agent,
        name: name.trim() || undefined,
        metadata: buildMetadata(),
      });
      if (res.ok) {
        setResult({
          kind: "ok",
          room: res.room_name,
          dispatchId: res.dispatch_id,
          agent: res.agent_name as Agent,
          to: res.to,
        });
      } else {
        setResult({ kind: "err", message: res.error });
      }
    });
  }

  const showDeedy = agent === "deedy-vba";
  const showAndie = agent === "andie-gvr";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-6"
    >
      {/* Agent picker */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-neutral-500">
          Agent
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {AGENTS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => setAgent(a.value)}
              className={`rounded-lg border px-4 py-3 text-left transition ${
                agent === a.value
                  ? "border-cyan-500/40 bg-cyan-500/5 text-neutral-100"
                  : "border-neutral-800 bg-neutral-900/50 text-neutral-300 hover:border-neutral-700"
              }`}
            >
              <div className="text-sm font-semibold">{a.label}</div>
              <div className="mt-0.5 text-xs text-neutral-400">{a.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Core fields */}
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          id="phone"
          label="Number to call"
          value={phone}
          onChange={setPhone}
          type="tel"
          placeholder="+14078195809"
          required
          help="E.164. 10-digit US numbers auto-prefixed with +1."
        />
        <Field
          id="name"
          label={showAndie ? "Member name" : "Recipient name"}
          value={name}
          onChange={setName}
          placeholder={showAndie ? "Stacey Johnson" : "Ethan Stopperich"}
          help={
            showAndie
              ? "Used as member_name in the greeting. Optional."
              : "Used as caller_name (first name auto-extracted). Optional."
          }
        />
      </div>

      {/* Advanced — agent-specific dynamic variables */}
      <div className="mt-6 border-t border-neutral-800 pt-5">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-neutral-400 hover:text-neutral-200"
        >
          {advanced ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          {showAndie ? "Andie" : "Deedy"} dynamic variables
        </button>

        {advanced && showDeedy && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="property_name"
              label="Property name"
              value={propertyName}
              onChange={setPropertyName}
              placeholder={DEEDY_DEFAULTS.property_name}
              help="Resort the caller will tour. Used in greeting + booking confirmation."
            />
            <Field
              id="premium_offer"
              label="Premium offer / incentive"
              value={premiumOffer}
              onChange={setPremiumOffer}
              placeholder={DEEDY_DEFAULTS.premium_offer}
              help="What the caller earns by completing the tour."
            />
            <Field
              id="placement_name"
              label="Placement / lead source"
              value={placementName}
              onChange={setPlacementName}
              placeholder={DEEDY_DEFAULTS.placement_name}
              help="Where the lead came from — QR slug, kiosk name, partner, etc."
            />
            <Field
              id="placement_opener_hook"
              label="Placement opener hook (optional)"
              value={placementHook}
              onChange={setPlacementHook}
              placeholder={`e.g. "you scanned at the resort pool"`}
              help="Optional first-line context Deedy can drop into the greeting."
            />
            <Field
              id="slot_1"
              label="Tour slot 1"
              value={slot1}
              onChange={setSlot1}
              placeholder={DEEDY_DEFAULTS.slot_1}
              help="First slot Deedy offers, e.g. 'Wednesday at 10:30 AM'."
            />
            <Field
              id="slot_2"
              label="Tour slot 2"
              value={slot2}
              onChange={setSlot2}
              placeholder={DEEDY_DEFAULTS.slot_2}
              help="Backup slot offered if the first is declined."
            />
            <SelectField
              id="on_property"
              label="On-property?"
              value={onProperty}
              onChange={(v) => setOnProperty(v as typeof onProperty)}
              options={[
                { value: "unknown", label: "Unknown — let Deedy ask" },
                { value: "yes", label: "Yes — guest is staying at the resort" },
                { value: "no", label: "No — off-property lead" },
              ]}
              help="Drives the deposit path: on-property = $75 folio hold, off-property = team-followup."
            />
          </div>
        )}

        {advanced && showAndie && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="incentive_amount"
              label="Cash credits in account"
              value={incentiveAmount}
              onChange={setIncentiveAmount}
              placeholder={ANDIE_DEFAULTS.incentive_amount}
              help='Read aloud, e.g. "$250".'
            />
            <Field
              id="transfer_bonus_amount"
              label="Transfer bonus (extra if they take live transfer)"
              value={transferBonus}
              onChange={setTransferBonus}
              placeholder={ANDIE_DEFAULTS.transfer_bonus_amount}
              help='Mentioned only when offering live transfer, e.g. "$250".'
            />
            <Field
              id="total_after_bonus"
              label="Total after bonus"
              value={totalAfterBonus}
              onChange={setTotalAfterBonus}
              placeholder={ANDIE_DEFAULTS.total_after_bonus}
              help='Sum Andie quotes after the live-transfer bonus, e.g. "$500".'
            />
            <SelectField
              id="is_returning_caller"
              label="Returning caller?"
              value={isReturning}
              onChange={(v) => setIsReturning(v as typeof isReturning)}
              options={[
                { value: "false", label: "First contact" },
                { value: "true", label: "Returning member" },
              ]}
              help="Adjusts the rapport opener."
            />
            <Field
              id="last_call_date"
              label="Last call date"
              value={lastCallDate}
              onChange={setLastCallDate}
              placeholder={ANDIE_DEFAULTS.last_call_date}
              help='Used for returning-caller context, e.g. "March 12, 2026" or "never".'
            />
            <Field
              id="booking_link_label"
              label="Booking link label"
              value={bookingLinkLabel}
              onChange={setBookingLinkLabel}
              placeholder={ANDIE_DEFAULTS.booking_link_label}
              help='Spoken when offering the Microsoft Bookings backup, e.g. "your scheduling link".'
            />

            {/* Identity verification (verify_me_to_caller tool) */}
            <div className="md:col-span-2 mt-2 pt-3 border-t border-neutral-800/60">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-neutral-500">
                Identity verification (optional · used by verify-me tool)
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  id="domain"
                  label="Email domain"
                  value={domain}
                  onChange={setDomain}
                  placeholder="gmail.com"
                  help="Domain Andie offers as one of three options."
                />
                <Field
                  id="masked_email"
                  label="Masked email"
                  value={maskedEmail}
                  onChange={setMaskedEmail}
                  placeholder="j***@gmail.com"
                  help="Used by Andie to confirm member identity safely."
                />
                <Field
                  id="masked_phone"
                  label="Masked phone (last 4)"
                  value={maskedPhone}
                  onChange={setMaskedPhone}
                  placeholder="•••-•••-5809"
                  help="Last four digits Andie uses for soft verify."
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-neutral-800 pt-5">
        <div className="text-xs text-neutral-500">
          {pending
            ? "Dispatching..."
            : "Click Dial — agent dials within ~1 second."}
        </div>
        <button
          type="submit"
          disabled={pending || !phone}
          className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
          {pending ? "Dialing..." : "Dial"}
        </button>
      </div>

      {result.kind === "ok" && (
        <div className="mt-5 flex items-start gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
          <div className="text-sm">
            <p className="font-medium text-emerald-200">
              Call dispatched to {result.agent === "deedy-vba" ? "Deedy" : "Andie"}
            </p>
            <p className="mt-1 text-emerald-100/80">
              Dialing <span className="tabular-nums">{result.to}</span>. Watch live in{" "}
              <a
                href={`/dashboard/calls/${encodeURIComponent(result.room)}`}
                className="underline"
              >
                Call detail
              </a>
              .
            </p>
            <p className="mt-2 font-mono text-[11px] text-emerald-100/60">
              room: {result.room} · dispatch: {result.dispatchId}
            </p>
          </div>
        </div>
      )}
      {result.kind === "err" && (
        <div className="mt-5 flex items-start gap-3 rounded-md border border-red-500/30 bg-red-500/5 p-4">
          <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
          <div className="text-sm">
            <p className="font-medium text-red-200">Couldn&apos;t place call</p>
            <p className="mt-1 text-red-100/80">{result.message}</p>
          </div>
        </div>
      )}
    </form>
  );
}

/* -------------------- field primitives -------------------- */

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  help,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  help?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-medium uppercase tracking-widest text-neutral-500"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
      />
      {help && <p className="mt-1.5 text-[11px] text-neutral-500">{help}</p>}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  help,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  help?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-medium uppercase tracking-widest text-neutral-500"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {help && <p className="mt-1.5 text-[11px] text-neutral-500">{help}</p>}
    </div>
  );
}
