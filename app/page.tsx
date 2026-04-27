import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-8 py-16">
      <header>
        <p className="text-xs uppercase tracking-widest text-cyan-400">VOXARIS · CONFIDENTIAL</p>
        <h1 className="mt-2 text-4xl font-semibold">GVR Voice Agent</h1>
        <p className="mt-2 text-neutral-400">
          Zero-hallucination Retell voice agent for Government Vacation Rewards. Two-lane response engine. Pricing-fact validator. Verification pass.
        </p>
      </header>
      <nav className="flex flex-col gap-3 text-cyan-300">
        <Link href="/dashboard" className="underline-offset-4 hover:underline">→ Live ops dashboard</Link>
        <a href="/api/health" className="underline-offset-4 hover:underline">→ Health check</a>
      </nav>
      <footer className="mt-auto text-xs text-neutral-500">
        Build {process.env.npm_package_version ?? "1.0.0-demo"} · {new Date().getFullYear()}
      </footer>
    </main>
  );
}
