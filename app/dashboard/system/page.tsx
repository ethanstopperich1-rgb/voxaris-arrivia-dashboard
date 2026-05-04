// Stub — webhook/fallback health panels ship next iteration.
export const dynamic = "force-dynamic";

export default function SystemPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      <h1 className="text-2xl font-semibold text-neutral-100">System</h1>
      <p className="text-sm text-neutral-400">
        Webhook health, fallback engagements, deploy history arriving soon.
      </p>
    </main>
  );
}
