#!/usr/bin/env python3
"""Harden the live OPC v2 Conversation Flow with PCI scope avoidance.

Adds explicit no-payment-data instructions to:
  1. Global prompt (hard prohibition + interrupt pattern)
  2. qualify_credit node (yes/no only, refuse card numbers)
"""
import json
import os
import sys
import urllib.request

API = os.environ.get("RETELL_API_KEY")
if not API:
    # Fallback: read from .env.local
    with open(os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")) as f:
        for line in f:
            if line.startswith("RETELL_API_KEY="):
                API = line.split("=", 1)[1].strip()
                break
if not API:
    print("RETELL_API_KEY missing", file=sys.stderr)
    sys.exit(1)

FLOW_ID = "conversation_flow_7b33ee185da7"
BASE = "https://api.retellai.com"

def req(method, path, body=None):
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(
        f"{BASE}{path}",
        method=method,
        data=data,
        headers={"Authorization": f"Bearer {API}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read())

flow = req("GET", f"/get-conversation-flow/{FLOW_ID}")

PCI_BLOCK = """

PAYMENT DATA — ABSOLUTE PROHIBITION (PCI scope avoidance):
NEVER ask for, accept, repeat, confirm, or acknowledge any of the following on this call:
  - Credit card number, debit card number, or PAN (primary account number)
  - CVV, CVC, security code, or expiration date
  - Bank account number or routing number
  - Full date of birth, Social Security Number, driver's license number
  - Billing ZIP or billing address
If the guest starts to read a card number aloud, IMMEDIATELY interrupt with:
"Please stop — I do not take any payment or card information on this call. Nothing is owed today. The welcome team will handle anything like that in person, securely, at the resort."
Then return to the previous question. If the guest insists on giving payment info, end the call politely."""

global_prompt = flow.get("global_prompt") or ""
if "PAYMENT DATA — ABSOLUTE PROHIBITION" not in global_prompt:
    flow["global_prompt"] = global_prompt.rstrip() + PCI_BLOCK
    print("✓ Hardened global_prompt with PCI prohibition")
else:
    print("• global_prompt already hardened (skipped)")

NEW_Q5_TEXT = (
    "Ask EXACTLY: 'Last one — do you and your attending partner, if applicable, have a major credit card in good standing? Just a yes or no — I do not need any card numbers.' "
    "If they ask if this is a credit check, say: 'No credit check on this call. This is only a yes-or-no eligibility confirmation. I do not take any card information.' "
    "If the guest starts to read a card number, immediately interrupt: 'Please stop — I do not take card numbers on this call. Just a yes or no is all I need.' Then re-ask the yes/no question. "
    "Accept ONLY a yes or no. Never write down, repeat, or confirm any digits."
)

patched_q5 = False
for node in flow.get("nodes", []):
    if node.get("id") == "qualify_credit":
        node["instruction"]["text"] = NEW_Q5_TEXT
        patched_q5 = True
        print("✓ Patched qualify_credit node — yes/no only, refuses card numbers")
        break
if not patched_q5:
    print("✗ qualify_credit node not found", file=sys.stderr)
    sys.exit(1)

# PATCH expects only fields we're updating
update_body = {
    "global_prompt": flow["global_prompt"],
    "nodes": flow["nodes"],
}
result = req("PATCH", f"/update-conversation-flow/{FLOW_ID}", update_body)
print(f"✓ Flow updated → version {result.get('version')}")
