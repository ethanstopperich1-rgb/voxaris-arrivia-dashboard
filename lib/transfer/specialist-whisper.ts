import { getCallMemory } from "@/lib/memory/redis-memory";

/** Build a <12s spoken context for the specialist whisper. */
export async function buildWhisper(input: {
  retell_call_id: string;
  reason: string;
}): Promise<{ whisper_text: string; three_way_message: string }> {
  const m = await getCallMemory(input.retell_call_id);
  const intents = (m?.recent_turns ?? [])
    .map((t) => t.route)
    .filter(Boolean)
    .slice(-3)
    .join(" → ");
  const cashFlag = (m?.recent_turns ?? []).some((t) => t.answer_card_id === "travel_savings_dollars_not_cash");
  const fragments = [
    "Heads up — caller asking about " + (input.reason || "GVR membership") + ".",
    intents ? `Intent path: ${intents}.` : "",
    cashFlag ? "I clarified travel savings dollars are not cash." : "",
    "They're ready to talk pricing and next steps with you.",
  ].filter(Boolean);
  const whisper_text = fragments.join(" ").slice(0, 280);
  const three_way_message =
    "Thanks for holding. I have a GVR specialist on the line and gave them the context.";
  return { whisper_text, three_way_message };
}
