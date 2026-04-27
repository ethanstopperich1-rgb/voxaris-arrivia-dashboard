const TABLE: Record<string, string> = {
  pricing:
    "I can't quote pricing over the phone — a licensed GVR specialist needs to walk you through the exact terms tied to your offer. Want me to connect you?",
  account_specific:
    "Anything tied to your specific account needs to go through a verified specialist for your security — let me get one on the line.",
  booking: "Bookings and changes are handled by a GVR specialist — I'll get you connected.",
  safety:
    "I can't give legal, tax, or financial advice — for those questions you'll want a qualified professional.",
  jailbreak:
    "I'll stay focused on travel savings dollars and how a GVR specialist can help — was there something specific about that you wanted to know?",
  out_of_scope:
    "That's a bit outside what I can help with on this call — would you like me to connect you to a GVR specialist?",
  pii:
    "Please don't share that with me — for your security, account details should only be shared with a verified specialist. Let me connect you.",
  transfer_request: "Connecting you now to a GVR specialist — one moment.",
  default: "Let me have a specialist confirm that for you — one moment while I connect you.",
};

export function gracefulDeflection(intent: string): string {
  return TABLE[intent] ?? TABLE.default!;
}
