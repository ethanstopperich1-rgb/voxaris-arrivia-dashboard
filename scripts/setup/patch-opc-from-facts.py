#!/usr/bin/env python3
"""Re-bind the live OPC v2 Conversation Flow to opc-facts.json.

Reads canonical numeric/string values from content/facts/opc-facts.json
and rewrites the matching node instructions so the flow no longer carries
hardcoded numbers in prompts.

Idempotent: safe to re-run after each fact change.
"""
import json
import os
import sys
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FACTS_PATH = os.path.join(ROOT, "content", "facts", "opc-facts.json")
ENV_PATH = os.path.join(ROOT, ".env.local")
FLOW_ID = "conversation_flow_7b33ee185da7"
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
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read())


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
    incentive = fact_by_topic(facts, "incentive")
    property_ = fact_by_topic(facts, "property")

    if not all([age, income, residency, prior, duration, incentive, property_]):
        print("✗ One or more required facts missing from opc-facts.json", file=sys.stderr)
        sys.exit(1)

    income_str = f"${income['min_combined_income_usd']:,}"
    countries = " or ".join(residency["allowed_countries"])
    countries_pretty = "the U.S. or Canada" if countries == "US or CA" else countries

    node_text_overrides = {
        "qualify_age": (
            f"Ask: 'Perfect. Are all attending decision-makers between {age['min_age']} and {age['max_age']}?' "
            "Do not ask for exact age. If they ask why, say: 'That is part of the eligibility guidelines for this specific ticket package.' "
            f"Accept yes only if all attending decision-makers fall in {age['min_age']}-{age['max_age']}."
        ),
        "qualify_income": (
            f"Ask warmly: 'And is your combined household income above {income_str} per year?' "
            "If they resist, say: 'I understand. I do not need exact income or proof — just a yes or no, and that information stays only on this call.' "
            "If they ask why, say: 'It is part of the eligibility guidelines for this specific ticket package — I am only confirming yes or no, not collecting financial details.'"
        ),
        "qualify_residency": (
            f"Ask: 'Are you currently a resident of {countries_pretty}?' "
            "If international, say: 'Got it. This specific package is usually limited by residency. Let me have the welcome team confirm if there's an option for you.'"
        ),
        "qualify_prior_tour": (
            f"Ask: 'Have you attended a Westgate vacation ownership preview in the last {prior['lookback_months']} months?' "
            "If yes, say: 'Got it. That may affect eligibility for this offer — let me check.' "
            f"Accept no only if no Westgate preview in the last {prior['lookback_months']} months."
        ),
        "soft_qualified_transition": (
            f"Perfect — based on what you shared, it looks like you may qualify. "
            f"The preview is about {duration['value_minutes']} minutes, and both decision-makers need to attend. "
            "Let me check the best available times for you."
        ),
    }

    flow = req("GET", f"/get-conversation-flow/{FLOW_ID}")
    patched = []
    for node in flow.get("nodes", []):
        nid = node.get("id")
        if nid in node_text_overrides:
            new_text = node_text_overrides[nid]
            cur = (node.get("instruction") or {}).get("text", "")
            if cur != new_text:
                node["instruction"]["text"] = new_text
                patched.append(nid)

    if not patched:
        print("• All target nodes already in sync with opc-facts.json")
        return

    result = req(
        "PATCH",
        f"/update-conversation-flow/{FLOW_ID}",
        {"nodes": flow["nodes"]},
    )
    print(f"✓ Patched {len(patched)} node(s) from facts: {', '.join(patched)}")
    print(f"✓ Flow updated → version {result.get('version')}")


if __name__ == "__main__":
    main()
