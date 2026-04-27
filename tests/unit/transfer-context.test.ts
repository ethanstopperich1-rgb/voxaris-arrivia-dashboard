import { describe, it, expect } from "vitest";
import { CallMemorySchema } from "@/lib/memory/memory-types";

describe("CallMemorySchema", () => {
  it("parses minimal memory", () => {
    const m = CallMemorySchema.parse({
      retell_call_id: "call_x",
      started_at: Date.now(),
    });
    expect(m.turn_count).toBe(0);
    expect(m.recent_turns).toEqual([]);
    expect(m.flags.jailbreak_attempts).toBe(0);
  });
});
