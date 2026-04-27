import type { ButtonHTMLAttributes } from "react";
export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded bg-cyan-500 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-cyan-400 disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
