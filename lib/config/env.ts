import { z } from "zod";

const bool = z
  .union([z.literal("true"), z.literal("false")])
  .transform((v) => v === "true");

const phone = z.string().regex(/^\+\d{10,15}$/, "must be E.164 phone number");

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  APP_API_KEY: z.string().min(8),
  DASHBOARD_BASIC_AUTH_USER: z.string().min(1),
  DASHBOARD_BASIC_AUTH_PASS: z.string().min(8),

  RETELL_API_KEY: z.string().min(1),
  RETELL_AGENT_ID: z.string().min(1),
  RETELL_LLM_ID: z.string().min(1),
  RETELL_PHONE_NUMBER: phone,
  RETELL_WEBHOOK_SECRET: z.string().min(8),
  RETELL_OUTAGE_FALLBACK_NUMBER: phone,
  RETELL_LLM_WEBSOCKET_URL: z.string().url(),

  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_FROM_NUMBER: phone,
  TWILIO_GVR_DEMO_DID: phone,
  TWILIO_SIP_TRUNK_SID: z.string().min(1),
  TWILIO_TERMINATION_SIP_URI: z.string().min(1),

  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  COHERE_API_KEY: z.string().min(1),

  HELICONE_API_KEY: z.string().optional(),
  HELICONE_BASE_URL: z.string().url().default("https://oai.helicone.ai"),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_DB_URL: z.string().min(1),

  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  PRIMARY_SPECIALIST_NUMBER: phone,
  BACKUP_SPECIALIST_NUMBER: phone,
  PRIMARY_SPECIALIST_SIP_URI: z.string().optional().default(""),
  SPECIALIST_SMS_NUMBER: phone,
  SPECIALIST_EMAIL: z.string().email(),
  SPECIALIST_SCREEN_POP_BASE_URL: z.string().url().optional(),

  DEMO_MODE: bool.default("true"),
  ANSWER_CARD_ONLY_MODE: bool.default("false"),
  ALLOW_FULL_RAG: bool.default("true"),
  ENABLE_VERIFICATION_PASS: bool.default("true"),
  ENABLE_PRICING_VALIDATOR: bool.default("true"),
  ENABLE_RETELL_NATIVE_KB: bool.default("false"),
  TRANSFER_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(10),
  MAX_RESPONSE_LATENCY_MS: z.coerce.number().int().positive().default(800),
  FULL_RAG_FILLER_THRESHOLD_MS: z.coerce.number().int().positive().default(700),
  KILL_SWITCH: bool.default("false"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const isTest = process.env.NODE_ENV === "test";
  const source = isTest ? { ...defaultsForTest(), ...process.env } : process.env;
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

function defaultsForTest(): Record<string, string> {
  return {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    APP_API_KEY: "test_api_key_value",
    DASHBOARD_BASIC_AUTH_USER: "admin",
    DASHBOARD_BASIC_AUTH_PASS: "test_pass_value",
    RETELL_API_KEY: "test",
    RETELL_AGENT_ID: "test",
    RETELL_LLM_ID: "test",
    RETELL_PHONE_NUMBER: "+10000000000",
    RETELL_WEBHOOK_SECRET: "test_secret_value",
    RETELL_OUTAGE_FALLBACK_NUMBER: "+10000000000",
    RETELL_LLM_WEBSOCKET_URL: "wss://test.example.com/llm",
    TWILIO_ACCOUNT_SID: "test",
    TWILIO_AUTH_TOKEN: "test",
    TWILIO_FROM_NUMBER: "+10000000000",
    TWILIO_GVR_DEMO_DID: "+10000000000",
    TWILIO_SIP_TRUNK_SID: "test",
    TWILIO_TERMINATION_SIP_URI: "test.pstn.twilio.com",
    ANTHROPIC_API_KEY: "test",
    OPENAI_API_KEY: "test",
    COHERE_API_KEY: "test",
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test",
    SUPABASE_SERVICE_ROLE_KEY: "test",
    SUPABASE_DB_URL: "postgresql://test",
    UPSTASH_REDIS_REST_URL: "https://test.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "test",
    PRIMARY_SPECIALIST_NUMBER: "+10000000000",
    BACKUP_SPECIALIST_NUMBER: "+10000000000",
    SPECIALIST_SMS_NUMBER: "+10000000000",
    SPECIALIST_EMAIL: "ops@example.com",
  };
}
