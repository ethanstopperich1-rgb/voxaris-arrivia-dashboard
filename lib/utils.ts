// Standard shadcn/ui `cn` helper. Combines `clsx` for conditional class
// merging with `tailwind-merge` to dedupe conflicting Tailwind utilities
// (e.g. `p-4` overrides `p-2` instead of both winning).
//
// Required dependencies (run once at the repo root):
//   pnpm add clsx tailwind-merge

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
