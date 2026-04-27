import { describe, it, expect, beforeAll } from "vitest";
import { hmacSha256 } from "@/lib/utils/hash";
import { verifyRetellSignature } from "@/lib/retell/verify-retell-signature";

beforeAll(() => {
  process.env.RETELL_WEBHOOK_SECRET = "test_secret_value";
});

describe("verify-retell-signature", () => {
  it("accepts a valid signature", () => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ event: "call_started", call: { call_id: "x" } });
    const sig = hmacSha256("test_secret_value", `${ts}${body}`);
    const r = verifyRetellSignature({
      header: `t=${ts},v1=${sig}`,
      rawBody: body,
    });
    expect(r.valid).toBe(true);
  });
  it("rejects when signature differs", () => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const r = verifyRetellSignature({
      header: `t=${ts},v1=deadbeef`,
      rawBody: "{}",
    });
    expect(r.valid).toBe(false);
  });
  it("rejects stale timestamp", () => {
    const stale = (Math.floor(Date.now() / 1000) - 10000).toString();
    const sig = hmacSha256("test_secret_value", `${stale}{}`);
    const r = verifyRetellSignature({ header: `t=${stale},v1=${sig}`, rawBody: "{}" });
    expect(r.valid).toBe(false);
  });
});
