type Transfer = {
  id: string;
  retell_call_id: string;
  reason: string;
  whisper_text: string;
  endpoint_kind: string;
  outcome: string | null;
  sms_sent_at: string | null;
  created_at: string;
};

export function TransferPanel({ transfers }: { transfers: Transfer[] }) {
  return (
    <section className="rounded-lg border border-neutral-800">
      <header className="border-b border-neutral-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
          Recent transfers
        </h2>
      </header>
      <ul className="divide-y divide-neutral-900">
        {transfers.length === 0 ? (
          <li className="px-4 py-3 text-sm text-neutral-500">No transfers in window.</li>
        ) : (
          transfers.map((t) => (
            <li key={t.id} className="px-4 py-3">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>{new Date(t.created_at).toLocaleTimeString()}</span>
                <span>{t.endpoint_kind}</span>
                <span
                  className={
                    t.outcome === "bridged"
                      ? "text-emerald-400"
                      : t.outcome === null
                        ? "text-cyan-400"
                        : "text-amber-400"
                  }
                >
                  {t.outcome ?? "in-flight"}
                </span>
              </div>
              <p className="mt-1 text-sm text-neutral-200">{t.reason}</p>
              <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{t.whisper_text}</p>
              <p className="mt-1 text-xs">
                SMS:{" "}
                {t.sms_sent_at ? (
                  <span className="text-emerald-400">sent</span>
                ) : (
                  <span className="text-amber-400">pending</span>
                )}
              </p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
