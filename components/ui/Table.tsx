import type { ReactNode } from "react";
export function Table({ children }: { children: ReactNode }) {
  return <table className="w-full text-sm">{children}</table>;
}
export function TR({ children }: { children: ReactNode }) {
  return <tr className="border-t border-neutral-900">{children}</tr>;
}
export function TH({ children }: { children: ReactNode }) {
  return <th className="px-4 py-2 text-left text-xs uppercase tracking-wider text-neutral-500">{children}</th>;
}
export function TD({ children }: { children: ReactNode }) {
  return <td className="px-4 py-2">{children}</td>;
}
