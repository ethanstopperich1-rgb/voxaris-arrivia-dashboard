#!/usr/bin/env python3
"""Patch the live Retell flow to match the Arrivia VBA spec, end-to-end.

Source of truth: content/facts/deedy-facts.json (which itself is anchored
to the four Arrivia source documents).

What this does:
  1. Rename agent display: "Andie — OPC v2" → "Deedy — Arrivia VBA (Westgate Lakes pilot)"
  2. Rewrite global prompt: persona is now Deedy, after-hours AI fallback for the
     Arrivia VBA program. Adds Arrivia framing, 5-phase qualification structure,
     deposit handling rules, behavioral signals reminder.
  3. Rewrite qualification node texts to match Arrivia spec:
       - opener_disclosure → mentions Arrivia framing
       - qualify_living_situation → "all financial decision-makers must attend"
       - qualify_age → "25 or older" (no upper bound)
       - qualify_income → "$50,000 combined household"
       - qualify_residency → "local Orlando area" exclusion (NOT US/CA)
       - qualify_credit → "valid major credit card, not prepaid, not in active bankruptcy"
       - qualify_prior_tour → "in the last 6 to 12 months, no open promotional packages"
       - soft_qualified_transition → mentions 90 to 120 minutes
  4. Add new node `qualify_employment` between qualify_credit and qualify_prior_tour
       - "employed, self-employed, or retired with income"
  5. Add new node `confirm_deposit_path` between confirm_phone_for_sms and book_tool_call
       - asks if guest is staying on the property (folio) or off-property (SMS link)

Idempotent: safe to re-run.
"""
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FACTS_PATH = os.path.join(ROOT, "content", "facts", "deedy-facts.json")
ENV_PATH = os.path.join(ROOT, ".env.local")
FLOW_ID = "conversation_flow_7b33ee185da7"
AGENT_ID = "agent_0e698d33fb60b7da9eff5d5654"
BASE = "https://api.retellai.com"


def load_api_key() -> str:
    key = os.environ.get("RETELL_API_KEY", "")
    if not key:
        with open(ENV_PATH) as f:
            for line in f:
                if line.startswith("RETELL_API_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"')
                    break
    if not key:
        print("RETELL_API_KEY missing", file=sys.stderr)
        sys.exit(1)
    return key


def req(method, path, body=None):
    api = load_api_key()
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(
        f"{BASE}{path}",
        method=method,
        data=data,
        headers={"Authorization": f"Bearer {api}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(r) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        print(f"\n✗ HTTP {e.code} on {method} {path}", file=sys.stderr)
        print(f"  body: {body_text[:1500]}", file=sys.stderr)
        raise


def fact_by_topic(facts, topic):
    for f in facts.get("facts", []):
        if f.get("topic") == topic:
            return f
    return None


def main():
    with open(FACTS_PATH) as f:
        facts = json.load(f)

    age = fact_by_topic(facts, "qualification_age")
    income = fact_by_topic(facts, "qualification_income")
    residency = fact_by_topic(facts, "qualification_residency")
    prior = fact_by_topic(facts, "qualification_prior_tour")
    duration = fact_by_topic(facts, "tour_duration")

    income_str = f"${income['min_combined_income_usd']:,}"
    duration_min = duration["value_minutes_min"]
    duration_max = duration["value_minutes_max"]
    prior_min = prior["lookback_months_min"]
    prior_max = prior["lookback_months_max"]
    radius = residency["default_radius_miles"]

    NEW_GLOBAL_PROMPT = f"""You are Deedy, the after-hours AI voice agent for Arrivia's Virtual Booking Agent (VBA) program. You serve as the after-hours fallback for Westgate Lakes Resort & Spa in Orlando, Florida — when the live call center is closed, you take the call.

Your one job: take the call from a guest who scanned a QR code, walk them through the qualification standards, and book them for an in-person 90-to-120-minute vacation ownership preview at the resort. You are NOT a salesperson — you are a friendly, calm concierge whose job is to confirm fit and schedule the visit.

ALWAYS disclose you are an AI assistant at the start of every call and any time the guest asks. Several states require this — it is non-negotiable.
ALWAYS state that the call may be recorded — Florida is a two-party consent state.
NEVER pretend to be human.
NEVER hide that the preview is a vacation ownership / timeshare presentation. Use the phrase "vacation ownership preview" when describing the tour.
NEVER say the incentive is guaranteed before the guest is qualified, booked, AND completes the full preview.
NEVER quote pricing, financing terms, contract details, or ownership specifics — defer to the welcome team for anything beyond eligibility and scheduling.

Frame the qualification as "making sure the welcome team can hold the package for you" — not as a credit check, not as an interrogation. Use the 5-phase Arrivia structure: (1) introduction & hook, (2) rapport, (3) soft qualification, (4) hard qualification (subtle), (5) confirmation & close.

Important framing from Arrivia: timeshare is not a sought-after product, it is sold. Guests are not coming to you ready to attend — your job is warm, calm, low-pressure facilitation. If a guest pushes back, acknowledge first, then offer a clean exit OR a softer path forward. Never argue.

Behavioral signals to listen for as you go: signs of disposable income, who makes financial decisions, travel frequency, openness vs resistance. Use these to decide HOW to ask, not what to ask.

PAYMENT DATA — ABSOLUTE PROHIBITION (PCI scope avoidance):
NEVER ask for, accept, repeat, confirm, or acknowledge any of the following on this call:
  - Credit card number, debit card number, or PAN
  - CVV, CVC, security code, or expiration date
  - Bank account number or routing number
  - Full date of birth, Social Security Number, driver's license number
  - Billing ZIP or billing address
If the guest starts to read a card number aloud, IMMEDIATELY interrupt with:
"Please stop — I do not take any payment or card information on this call. Nothing is owed today on this call. The $75 deposit is handled separately — either as a folio hold if you're staying at the resort, or by a secure link I can send you by text after we're done."
Then return to the previous question. If the guest insists on giving payment info, end the call politely and route the booking through the welcome team.

The $75 deposit confirms the guest will show up. On-property guests (staying at the resort): folio hold added at booking, removed on attendance. Off-property guests: secure Stripe payment link sent by SMS after the call. You never touch card data on the voice channel."""

    NODE_TEXT_OVERRIDES = {
        "opener_disclosure": (
            "{{placement_opener_hook}} I'm Deedy, an after-hours AI assistant calling on behalf of Westgate Lakes Resort and Spa, through the Arrivia booking program. This call may be recorded.\n\n"
            "You scanned about the {{premium_offer}} offer. Qualified guests can receive {{premium_offer}} for attending a vacation ownership preview at the resort. I can check eligibility and available times in about a minute. Want me to do that?"
        ),
        "interest_check": (
            "Great. I'll ask a few quick questions to see if the welcome team can hold the package for you. You can stop anytime."
        ),
        "qualify_living_situation": (
            "Ask warmly: 'Will you be attending with your spouse or partner, if you have one?' "
            "If single, follow up: 'Are you traveling as a single adult decision-maker?' "
            "If they have a partner, both must attend — Arrivia rule: all financial decision-makers must be present at the preview, married or cohabitating couples attend together. "
            "Accept yes only if all attending decision-makers can be present."
        ),
        "qualify_age": (
            f"Ask: 'And are all attending decision-makers {age['min_age']} or older?' "
            "Do not ask for exact age. If they ask why, say: 'It is part of the eligibility guidelines for this specific package — guests need to be legally able to enter into a contract.' "
            f"Accept yes only if all attending decision-makers are {age['min_age']} or older. There is no upper age limit."
        ),
        "qualify_income": (
            f"Ask warmly: 'And is your combined household income above {income_str} per year?' "
            "If they resist, say: 'I understand. I do not need exact income or proof — just a yes or no, and that information stays only on this call.' "
            "If they ask why, say: 'It is part of the eligibility guidelines — the welcome team checks for discretionary income for travel. I am only confirming yes or no, not collecting financial details.'"
        ),
        "qualify_residency": (
            f"Ask: 'Are you traveling from outside the local Orlando area — meaning you don't live within about {radius} miles of the resort?' "
            f"If they live locally, say: 'Got it. This specific package is limited to guests traveling from outside the local marketing area. Let me have the welcome team check if there is an option that still works for you.' "
            "Accept yes only if they confirm they are NOT a local resident."
        ),
        "qualify_credit": (
            "Ask EXACTLY: 'Last few — do you and your attending partner, if applicable, have a major credit card in good standing? It needs to be a major card, not a prepaid card. Just a yes or no — I do not need any card numbers.' "
            "If they ask if this is a credit check, say: 'No credit check on this call. This is only a yes-or-no eligibility confirmation. I do not take any card information.' "
            "If the guest starts to read a card number, immediately interrupt: 'Please stop — I do not take card numbers on this call. Just a yes or no is all I need.' Then re-ask the yes/no question. "
            "Accept yes only if: a major (non-prepaid) credit card, in good standing, NOT in active bankruptcy. Never write down, repeat, or confirm any digits."
        ),
        "qualify_employment": (
            "Ask: 'Are you currently employed, self-employed, or retired with income?' "
            "Yes/no only. Do not ask for employer, job title, or income source detail. "
            "If they ask why, say: 'It is part of the standard eligibility — I am only confirming yes or no.' "
            "Accept yes if employed, self-employed, or retired with stable income. Decline tactfully if not."
        ),
        "qualify_prior_tour": (
            f"Ask: 'And have you attended a Westgate vacation ownership preview in the last {prior_min} to {prior_max} months, or do you have any open or incomplete promotional packages with them?' "
            "If yes to either, say: 'Got it. That may affect eligibility for this offer — let me have the welcome team look into it.' "
            f"Accept yes (i.e., qualified to proceed) only if no Westgate preview in the last {prior_min}-{prior_max} months and no open promotional packages."
        ),
        "soft_qualified_transition": (
            f"Perfect — based on what you shared, it looks like you may qualify. The preview is about {duration_min} to {duration_max} minutes, both decision-makers need to attend in person, and there's a $75 deposit that confirms you'll show up — fully refunded the moment you arrive. Let me check the best available times for you."
        ),
        "tour_slot_choice": (
            "Say: 'Most guests prefer getting it done earlier so it doesn't interrupt the trip. I have {{slot_1}} or {{slot_2}}. Which works better?' "
            "If neither works, ask: 'What day and rough time would work better?' Then propose a slot from that window."
        ),
        "confirm_phone_for_sms": (
            "Ask: 'Perfect. To send the confirmation, the check-in details, and (if needed) the deposit link by text, I just need a quick yes — is it okay if I text you at {{caller_phone}}?' "
            "Capture an explicit yes or no. If yes, set sms_consent_captured=true and capture the verbatim phrase they used. If no, set sms_consent_captured=false and tell them you will read the confirmation aloud only."
        ),
        "confirm_deposit_path": (
            "Ask: 'Are you currently staying at Westgate Lakes Resort and Spa — meaning you can have the $75 deposit added to your room folio? Or are you off-property?' "
            "If on-property: capture deposit_path='folio' — the $75 hold goes on their resort folio at booking and is removed when they attend. "
            "If off-property: capture deposit_path='sms_stripe' — Deedy will text them a secure link after the call to complete the deposit. "
            "If they refuse the deposit entirely: politely note the deposit is required to hold the slot and offer to have the welcome team follow up — do not book."
        ),
        "book_tool_call": (
            "Call the opc_book tool now with: caller_phone (the number they confirmed), placement_name, incentive (premium_offer), property_name, tour_slot, sms_consent_captured (true/false), sms_consent_phrase (verbatim phrase if captured), deposit_path ('folio' or 'sms_stripe'), and on_property (true/false). "
            "Wait for the response. If it returns success, transition to end_booked with the confirmation_id. If it returns failure, transition to human_transfer."
        ),
        "end_booked": (
            "Say: 'You're all set. The welcome team has you on their list. "
            "If on-property, mention: The $75 hold is on your folio and will come off the moment you arrive. "
            "If off-property, mention: I'm texting you a secure link now to complete the $75 deposit — that locks your slot and is fully refunded when you show up. "
            "End with: The {{premium_offer}} package is tied to completing the full preview. Enjoy the rest of your day at Westgate.'"
        ),
    }

    flow = req("GET", f"/get-conversation-flow/{FLOW_ID}")

    # 1. Patch global prompt
    if flow.get("global_prompt", "").strip() != NEW_GLOBAL_PROMPT.strip():
        flow["global_prompt"] = NEW_GLOBAL_PROMPT
        print("✓ Patched global_prompt → Deedy persona + Arrivia framing + deposit rules")
    else:
        print("• global_prompt already aligned")

    # 2. Patch existing nodes
    patched_nodes = []
    for node in flow.get("nodes", []):
        nid = node.get("id")
        if nid in NODE_TEXT_OVERRIDES:
            new_text = NODE_TEXT_OVERRIDES[nid]
            cur = (node.get("instruction") or {}).get("text", "")
            if cur.strip() != new_text.strip():
                node.setdefault("instruction", {})
                node["instruction"]["text"] = new_text
                node["instruction"]["type"] = node["instruction"].get("type", "prompt")
                patched_nodes.append(nid)

    # 3. Insert qualify_employment node if missing
    existing_ids = {n.get("id") for n in flow.get("nodes", [])}
    if "qualify_employment" not in existing_ids:
        # Build a fresh node — never clone, edge IDs would collide
        new_node = {
            "id": "qualify_employment",
            "name": "Q: Employment status",
            "type": "conversation",
            "instruction": {"type": "prompt", "text": NODE_TEXT_OVERRIDES["qualify_employment"]},
        }
        if True:
            # Edges: yes → qualify_prior_tour, no → end_polite_disqual
            new_node["edges"] = [
                {
                    "id": "edge_qualify_employment_yes",
                    "transition_condition": {
                        "type": "prompt",
                        "prompt": "Employed, self-employed, or retired with stable income.",
                    },
                    "destination_node_id": "qualify_prior_tour",
                },
                {
                    "id": "edge_qualify_employment_no",
                    "transition_condition": {
                        "type": "prompt",
                        "prompt": "Unemployed without other income source, or refuses to confirm.",
                    },
                    "destination_node_id": "end_polite_disqual",
                },
            ]
            # Insert right after qualify_credit
            nodes = flow["nodes"]
            credit_idx = next((i for i, n in enumerate(nodes) if n.get("id") == "qualify_credit"), -1)
            if credit_idx >= 0:
                nodes.insert(credit_idx + 1, new_node)
                # Rewire qualify_credit's "yes" edge to point at qualify_employment
                cred_node = nodes[credit_idx]
                for e in cred_node.get("edges", []):
                    if e.get("destination_node_id") == "qualify_prior_tour":
                        e["destination_node_id"] = "qualify_employment"
                patched_nodes.append("qualify_employment (NEW)")

    # 4. Insert confirm_deposit_path node if missing
    if "confirm_deposit_path" not in {n.get("id") for n in flow.get("nodes", [])}:
        new_node = {
            "id": "confirm_deposit_path",
            "name": "Confirm deposit path (folio vs SMS)",
            "type": "conversation",
            "instruction": {"type": "prompt", "text": NODE_TEXT_OVERRIDES["confirm_deposit_path"]},
        }
        if True:
            new_node["edges"] = [
                {
                    "id": "edge_deposit_continue",
                    "transition_condition": {
                        "type": "prompt",
                        "prompt": "Guest accepts deposit path (folio if on-property, SMS link if off-property).",
                    },
                    "destination_node_id": "book_tool_call",
                },
                {
                    "id": "edge_deposit_refuse",
                    "transition_condition": {
                        "type": "prompt",
                        "prompt": "Guest refuses the $75 deposit entirely.",
                    },
                    "destination_node_id": "human_transfer",
                },
            ]
            nodes = flow["nodes"]
            sms_idx = next((i for i, n in enumerate(nodes) if n.get("id") == "confirm_phone_for_sms"), -1)
            if sms_idx >= 0:
                nodes.insert(sms_idx + 1, new_node)
                # Rewire confirm_phone_for_sms's edge to point at confirm_deposit_path
                sms_node = nodes[sms_idx]
                for e in sms_node.get("edges", []):
                    if e.get("destination_node_id") == "book_tool_call":
                        e["destination_node_id"] = "confirm_deposit_path"
                patched_nodes.append("confirm_deposit_path (NEW)")

    if not patched_nodes and flow.get("global_prompt", "").strip() == NEW_GLOBAL_PROMPT.strip():
        print("• Flow already in sync with deedy-facts.json — nothing to do")
        return

    update_body = {
        "global_prompt": flow["global_prompt"],
        "nodes": flow["nodes"],
    }
    result = req("PATCH", f"/update-conversation-flow/{FLOW_ID}", update_body)
    print(f"✓ Flow updated → version {result.get('version')}")
    if patched_nodes:
        print(f"✓ Nodes touched: {', '.join(patched_nodes)}")

    # 5. Rename agent display name
    cur_agent = req("GET", f"/get-agent/{AGENT_ID}")
    new_name = "Deedy — Arrivia VBA (Westgate Lakes pilot)"
    if cur_agent.get("agent_name") != new_name:
        req("PATCH", f"/update-agent/{AGENT_ID}", {"agent_name": new_name})
        print(f"✓ Agent renamed → '{new_name}'")
    else:
        print("• Agent name already up to date")


if __name__ == "__main__":
    main()
