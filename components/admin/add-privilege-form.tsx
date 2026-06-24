"use client";

import { useState } from "react";
import type { CreatePrivilegeInput, PrivilegeCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  partnerName: string;
  onClose: () => void;
  onSubmit: (input: CreatePrivilegeInput) => Promise<{ ok: boolean; error?: string }>;
};

const CATEGORIES: PrivilegeCategory[] = ["health", "fnb", "service", "lifestyle"];

const EMPTY: CreatePrivilegeInput = {
  title: "",
  summary: "",
  description: "",
  terms: "",
  howToRedeem: "",
  category: "lifestyle",
  discountLabel: "",
  coverImage: "",
  validFrom: new Date().toISOString().slice(0, 10),
  validUntil: "",
  isActive: true,
  sortOrder: 0,
  codeMode: "shared",
};

export function AddPrivilegeForm({ open, partnerName, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<CreatePrivilegeInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const set = <K extends keyof CreatePrivilegeInput>(key: K, value: CreatePrivilegeInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Privilege title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await onSubmit(form);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Could not create privilege.");
      return;
    }
    setForm(EMPTY);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/50 backdrop-blur-sm">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="bg-white rounded-2xl border border-cream-300 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="px-6 py-5 border-b border-cream-200">
          <h3 className="text-forest font-semibold text-lg">Add Privilege</h3>
          <p className="text-ink-muted text-xs mt-1">Partner: {partnerName}</p>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {error && (
            <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <label className="sm:col-span-2 block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Title *</span>
            <input
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Discount label</span>
            <input
              value={form.discountLabel ?? ""}
              onChange={(e) => set("discountLabel", e.target.value)}
              placeholder="15% OFF"
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Category</span>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value as PrivilegeCategory)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Valid from</span>
            <input
              type="date"
              value={form.validFrom ?? ""}
              onChange={(e) => set("validFrom", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Valid until</span>
            <input
              type="date"
              value={form.validUntil ?? ""}
              onChange={(e) => set("validUntil", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <label className="sm:col-span-2 block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Cover image URL</span>
            <input
              value={form.coverImage ?? ""}
              onChange={(e) => set("coverImage", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <label className="sm:col-span-2 block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Summary</span>
            <input
              value={form.summary ?? ""}
              onChange={(e) => set("summary", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <label className="sm:col-span-2 block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Description</span>
            <textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <label className="sm:col-span-2 block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">How to redeem</span>
            <textarea
              rows={3}
              value={form.howToRedeem ?? ""}
              onChange={(e) => set("howToRedeem", e.target.value)}
              placeholder="One step per line"
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <label className="sm:col-span-2 block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Terms</span>
            <textarea
              rows={3}
              value={form.terms ?? ""}
              onChange={(e) => set("terms", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Code mode</span>
            <select
              value={form.codeMode ?? "shared"}
              onChange={(e) => set("codeMode", e.target.value as CreatePrivilegeInput["codeMode"])}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="shared">Shared code</option>
              <option value="unique_pool">Unique pool</option>
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-forest">
            <input
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={(e) => set("isActive", e.target.checked)}
              className="rounded border-cream-300"
            />
            Active
          </label>
        </div>
        <div className="px-6 py-4 border-t border-cream-200 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-cream-300 px-4 py-2 text-sm text-ink-light hover:bg-cream-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={cn("btn-primary text-sm px-5 py-2", saving && "opacity-60")}
          >
            {saving ? "Creating…" : "Create Privilege"}
          </button>
        </div>
      </form>
    </div>
  );
}
