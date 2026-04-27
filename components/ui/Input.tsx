import type { InputHTMLAttributes } from "react";
export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 ${className}`}
      {...props}
    />
  );
}
