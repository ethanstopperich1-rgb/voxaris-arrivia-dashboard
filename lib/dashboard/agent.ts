// Shared helpers so EVERY dashboard page filters by the same
// ?agent=deedy|andie param the same way. Server-only — keeps URL-driven
// state out of every individual page's parsing logic.

export type AgentSlug = "deedy" | "andie";

const AGENT_DB_NAMES: Record<AgentSlug, string> = {
  deedy: "deedy-vba",
  andie: "andie-gvr",
};

const AGENT_LABELS: Record<AgentSlug, { label: string; sublabel: string; accent: "cyan" | "violet" }> = {
  deedy: { label: "Deedy", sublabel: "Arrivia · Booking", accent: "cyan" },
  andie: { label: "Andie", sublabel: "GVR · Re-engagement", accent: "violet" },
};

/** Read `?agent=` from page-level searchParams. Default = deedy. */
export function resolveAgent(
  searchParams: { agent?: string | string[] } | undefined,
): AgentSlug {
  const raw = Array.isArray(searchParams?.agent)
    ? searchParams!.agent[0]
    : searchParams?.agent;
  return raw === "andie" ? "andie" : "deedy";
}

/** Map UI slug → the DB-side `agent_name` column value. */
export function dbAgentName(slug: AgentSlug): string {
  return AGENT_DB_NAMES[slug];
}

export function agentMeta(slug: AgentSlug) {
  return AGENT_LABELS[slug];
}
