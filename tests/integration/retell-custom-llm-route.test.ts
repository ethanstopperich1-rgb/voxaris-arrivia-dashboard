import { describe, it, expect } from "vitest";
import { RetellLLMRequest, lastUserUtterance } from "@/lib/retell/parse-retell-request";

describe("RetellLLMRequest schema", () => {
  it("parses minimal request", () => {
    const r = RetellLLMRequest.parse({
      call_id: "call_x",
      transcript: [{ role: "user", content: "hi" }],
    });
    expect(lastUserUtterance(r.transcript)).toBe("hi");
  });
  it("rejects missing call_id", () => {
    const r = RetellLLMRequest.safeParse({ transcript: [] });
    expect(r.success).toBe(false);
  });
});
