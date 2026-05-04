"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, AlertCircle } from "lucide-react";

export function SignInForm({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const router = useRouter();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      if (res.ok) {
        const j = await res.json();
        router.replace(j.redirect ?? redirectTo);
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        setErr(j.error === "invalid_credentials" ? "Wrong username or password." : "Sign-in failed.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="relative z-10 flex flex-col gap-4">
      <div>
        <label
          htmlFor="username"
          className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-neutral-500"
        >
          Username
        </label>
        <input
          id="username"
          autoFocus
          autoComplete="username"
          value={u}
          onChange={(e) => setU(e.target.value)}
          className="w-full rounded-md border border-neutral-800 bg-neutral-950/80 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
          placeholder="arrivia"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-neutral-500"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={p}
          onChange={(e) => setP(e.target.value)}
          className="w-full rounded-md border border-neutral-800 bg-neutral-950/80 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
          placeholder="••••••••"
        />
      </div>

      {err && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {err}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !u || !p}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-400 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
