// Modern sidebar (uniquesonu/modern-side-bar via 21st.dev), customized
// for the Voxaris voice-ops dashboard. Routes wired to our IA:
//   /dashboard            — Overview
//   /dashboard/calls      — Calls + transcripts
//   /dashboard/agents     — Per-agent (Deedy / Andie)
//   /dashboard/cost       — Spend + projections
//   /dashboard/system     — Webhook + fallback health
//
// Dark-themed to match the existing dashboard.

"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Menu,
  Phone,
  PhoneOutgoing,
  Calendar,
  MapPin,
  ListChecks,
  Wrench,
  X,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string;
};

const NAV: Item[] = [
  // Client-facing — per-agent executive view (default Deedy via top-of-page tabs)
  { id: "overview", name: "Overview", icon: Home, href: "/dashboard" },
  { id: "calendar", name: "Calendar", icon: Calendar, href: "/dashboard/calendar" },
  { id: "calls", name: "Calls", icon: Phone, href: "/dashboard/calls" },
  { id: "placements", name: "Placements", icon: MapPin, href: "/dashboard/placements" },
  // Operations — engineering / admin
  { id: "ops", name: "Engineering ops", icon: Wrench, href: "/dashboard/ops" },
  { id: "queue", name: "Dial queue", icon: ListChecks, href: "/dashboard/queue" },
  { id: "outbound", name: "Outbound", icon: PhoneOutgoing, href: "/dashboard/outbound" },
];

export function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const onResize = () => setIsOpen(window.innerWidth >= 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname?.startsWith(href);

  // Preserve `?agent=` across nav so clicking sidebar entries while
  // viewing Andie keeps you on Andie (instead of bouncing back to
  // Deedy default on every page).
  const activeAgent = searchParams?.get("agent");
  const hrefWithAgent = (href: string) => {
    if (!activeAgent) return href;
    const sep = href.includes("?") ? "&" : "?";
    return `${href}${sep}agent=${activeAgent}`;
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed top-4 left-4 z-50 p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 md:hidden hover:bg-neutral-800 transition"
        aria-label="Toggle sidebar"
      >
        {isOpen ? (
          <X className="h-5 w-5 text-neutral-300" />
        ) : (
          <Menu className="h-5 w-5 text-neutral-300" />
        )}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-40 transition-all duration-300 ease-in-out flex flex-col",
          "bg-neutral-950/95 backdrop-blur border-r border-neutral-800",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-20" : "w-64",
          "md:translate-x-0 md:static md:z-auto",
          className,
        )}
      >
        {/* Header — Arrivia wordmark (the platform) over Voxaris (the
            engine that runs it). Inverted to pure white so it reads
            cleanly against the dark sidebar — user preference over
            the white-pill treatment that boxes the logo in. */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex flex-col gap-1.5 leading-tight">
                <Image
                  src="/logo/arrivia.svg"
                  alt="Arrivia"
                  width={120}
                  height={28}
                  priority
                  className="h-7 w-auto brightness-0 invert"
                />
                <span className="text-[10px] uppercase tracking-widest text-cyan-400">
                  Voxaris · Live Ops
                </span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <Image
              src="/logo/arrivia.svg"
              alt="Arrivia"
              width={32}
              height={32}
              priority
              className="h-7 w-auto mx-auto brightness-0 invert"
            />
          )}
          <button
            onClick={() => setIsCollapsed((v) => !v)}
            className="hidden md:flex p-1.5 rounded-md hover:bg-neutral-800 transition"
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-neutral-400" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-neutral-400" />
            )}
          </button>
        </div>

        {/* Search (only when expanded) */}
        {!isCollapsed && (
          <div className="px-3 py-3 border-b border-neutral-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Search calls, rooms..."
                className="w-full pl-8 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-md text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition"
              />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.id}>
                  <Link
                    // Cast: typed-routes flag rejects routes whose pages
                    // don't exist yet (calls/agents/cost/system are
                    // stubbed below). Safe — Next will 404 gracefully
                    // until each page lands.
                    href={hrefWithAgent(item.href) as never}
                    onClick={() => {
                      if (window.innerWidth < 768) setIsOpen(false);
                    }}
                    className={cn(
                      "group relative flex items-center rounded-md transition-all duration-200",
                      isCollapsed
                        ? "justify-center p-2.5"
                        : "gap-2.5 px-3 py-2",
                      active
                        ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                        : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100 border border-transparent",
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        active
                          ? "text-cyan-400"
                          : "text-neutral-500 group-hover:text-neutral-200",
                      )}
                    />
                    {!isCollapsed && (
                      <span className="flex items-center justify-between w-full">
                        <span
                          className={cn(
                            "text-sm",
                            active ? "font-medium" : "font-normal",
                          )}
                        >
                          {item.name}
                        </span>
                        {item.badge && (
                          <span
                            className={cn(
                              "px-1.5 py-0.5 text-[10px] font-medium rounded-full",
                              active
                                ? "bg-cyan-500/20 text-cyan-200"
                                : "bg-neutral-800 text-neutral-300",
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </span>
                    )}

                    {/* Tooltip when collapsed */}
                    {isCollapsed && (
                      <div className="pointer-events-none absolute left-full ml-2 px-2 py-1 bg-neutral-900 border border-neutral-800 text-neutral-100 text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition whitespace-nowrap z-50 shadow-lg">
                        {item.name}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer status */}
        <div className="border-t border-neutral-800 px-3 py-3">
          {isCollapsed ? (
            <div className="flex justify-center">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>Voxaris · us-east</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
