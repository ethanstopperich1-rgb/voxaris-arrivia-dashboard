import { env } from "@/lib/config/env";

const BASE = "https://api.retellai.com";

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const e = env();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${e.RETELL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Retell ${method} ${path} ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export const retell = {
  createLLM: <T = unknown>(body: unknown) => call<T>("POST", "/create-retell-llm", body),
  updateLLM: <T = unknown>(id: string, body: unknown) =>
    call<T>("PATCH", `/update-retell-llm/${id}`, body),
  getLLM: <T = unknown>(id: string) => call<T>("GET", `/get-retell-llm/${id}`),

  createAgent: <T = unknown>(body: unknown) => call<T>("POST", "/create-agent", body),
  updateAgent: <T = unknown>(id: string, body: unknown) =>
    call<T>("PATCH", `/update-agent/${id}`, body),
  getAgent: <T = unknown>(id: string) => call<T>("GET", `/get-agent/${id}`),
  publishAgent: <T = unknown>(id: string, body?: unknown) =>
    call<T>("POST", `/publish-agent/${id}`, body ?? {}),

  createKB: <T = unknown>(body: unknown) => call<T>("POST", "/create-knowledge-base", body),
  addKBSource: <T = unknown>(id: string, body: unknown) =>
    call<T>("POST", `/add-knowledge-base-sources/${id}`, body),

  importPhoneNumber: <T = unknown>(body: unknown) =>
    call<T>("POST", "/import-phone-number", body),
  updatePhoneNumber: <T = unknown>(num: string, body: unknown) =>
    call<T>("PATCH", `/update-phone-number/${encodeURIComponent(num)}`, body),

  createPhoneCall: <T = unknown>(body: unknown) =>
    call<T>("POST", "/create-phone-call", body),
  getCall: <T = unknown>(id: string) => call<T>("GET", `/get-call/${id}`),
};
