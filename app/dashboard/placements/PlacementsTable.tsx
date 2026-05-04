"use client";

// Placements table with create / edit dialogs and active-toggle.

import { useState, useTransition } from "react";
import type { PlacementRow } from "./page";
import {
  createPlacement,
  updatePlacement,
  togglePlacementActive,
} from "./actions";

export function PlacementsTable({ placements }: { placements: PlacementRow[] }) {
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<PlacementRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-400">
          {placements.length} placement{placements.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-md bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 text-sm text-cyan-300 hover:bg-cyan-500/20"
        >
          + New placement
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/60">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900/80 text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Property</th>
              <th className="px-4 py-3 text-left font-medium">Premium offer</th>
              <th className="px-4 py-3 text-right font-medium">Scans</th>
              <th className="px-4 py-3 text-center font-medium">Active</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/70">
            {placements.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                  No placements yet — create your first one.
                </td>
              </tr>
            )}
            {placements.map((p) => (
              <PlacementRowItem
                key={p.slug}
                p={p}
                onEdit={() => setEditing(p)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <PlacementDialog
          mode="create"
          onClose={() => setShowNew(false)}
        />
      )}
      {editing && (
        <PlacementDialog
          mode="edit"
          placement={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function PlacementRowItem({
  p,
  onEdit,
}: {
  p: PlacementRow;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const onToggle = () => {
    startTransition(async () => {
      await togglePlacementActive(p.slug, !p.active);
    });
  };

  return (
    <tr className="transition hover:bg-neutral-900/60">
      <td className="px-4 py-3 font-mono text-xs text-neutral-300">{p.slug}</td>
      <td className="px-4 py-3 text-neutral-200">{p.name}</td>
      <td className="px-4 py-3 text-neutral-400">{p.property_name ?? "—"}</td>
      <td className="px-4 py-3 text-neutral-400">{p.premium_offer ?? "—"}</td>
      <td className="px-4 py-3 text-right text-neutral-300 tabular-nums">
        {p.scan_count}
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={onToggle}
          disabled={pending}
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
            p.active
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-neutral-700/40 bg-neutral-800/50 text-neutral-400"
          }`}
        >
          {p.active ? "active" : "off"}
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <a
            href={`/api/placements/${encodeURIComponent(p.slug)}/qr.png`}
            download={`qr-${p.slug}.png`}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            Download QR
          </a>
          <button
            onClick={onEdit}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            Edit
          </button>
        </div>
      </td>
    </tr>
  );
}

function PlacementDialog({
  mode,
  placement,
  onClose,
}: {
  mode: "create" | "edit";
  placement?: PlacementRow;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createPlacement(formData)
          : await updatePlacement(formData);
      if (!res.ok) {
        setError(res.error ?? "Save failed");
      } else {
        onClose();
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-100">
            {mode === "create" ? "New placement" : `Edit · ${placement?.slug}`}
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <Field
            label="Slug"
            name="slug"
            placeholder="westgate-lakes-pool"
            defaultValue={placement?.slug}
            required
            readOnly={mode === "edit"}
            help="Lowercase + hyphens. Used in the QR URL."
          />
          <Field
            label="Name"
            name="name"
            placeholder="Westgate Lakes — Pool Bar"
            defaultValue={placement?.name}
            required
          />
          <Field
            label="Property"
            name="property_name"
            placeholder="Westgate Lakes Resort & Spa"
            defaultValue={placement?.property_name ?? ""}
          />
          <Field
            label="Premium offer"
            name="premium_offer"
            placeholder="complimentary three-night Orlando getaway"
            defaultValue={placement?.premium_offer ?? ""}
          />
          <Field
            label="Brand"
            name="brand"
            placeholder="ARRIVIA"
            defaultValue={placement?.brand ?? "ARRIVIA"}
          />
          <Field
            label="Landing URL"
            name="qr_target_url"
            type="url"
            placeholder="https://example.com/landing"
            defaultValue={placement?.qr_target_url ?? ""}
          />

          {error && (
            <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
            >
              {pending ? "Saving…" : mode === "create" ? "Create" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  required,
  readOnly,
  help,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  readOnly?: boolean;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-neutral-500">
        {label}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        readOnly={readOnly}
        className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 placeholder-neutral-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 read-only:opacity-70"
      />
      {help && <span className="mt-1 block text-[11px] text-neutral-500">{help}</span>}
    </label>
  );
}
