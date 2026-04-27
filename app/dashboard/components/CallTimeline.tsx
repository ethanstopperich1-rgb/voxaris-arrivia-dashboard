type Event = { event: string; duration_ms: number | null; created_at: string; meta: unknown };

export function CallTimeline({ events }: { events: Event[] }) {
  return (
    <ol className="space-y-2 font-mono text-xs">
      {events.map((e, i) => (
        <li key={i} className="flex justify-between border-l-2 border-neutral-800 pl-3">
          <span className="text-cyan-400">{e.event}</span>
          <span className="text-neutral-500">
            {new Date(e.created_at).toLocaleTimeString()} {e.duration_ms != null ? `· ${e.duration_ms}ms` : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}
