import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: { service: "gvr-retell-voice-agent" },
  redact: {
    paths: [
      "*.from_number",
      "*.to_number",
      "*.caller_phone",
      "*.api_key",
      "headers.authorization",
    ],
    censor: "[redacted]",
  },
});
