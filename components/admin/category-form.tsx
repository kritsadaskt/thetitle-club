"use client";

import { useEffect, useRef, useState } from "react";
import type { CreatePrivilegeCategoryInput, PrivilegeCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLOR_PRESETS = [
  { label: "Emerald", value: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "Amber", value: "bg-amber-50 text-amber-700 border-amber-200" },
  { label: "Sky", value: "bg-sky-50 text-sky-700 border-sky-200" },
  { label: "Purple", value: "bg-purple-50 text-purple-700 border-purple-200" },
  { label: "Rose", value: "bg-rose-50 text-rose-700 border-rose-200" },
  { label: "Gray", value: "bg-gray-100 text-gray-700 border-gray-200" },
];

const EMPTY: CreatePrivilegeCategoryInput = {
  label: "",
  key: "",
  color: COLOR_PRESETS[0].value,
  sortOrder: 0,
};

type Props = {
  open: boolean;
  initial?: CreatePrivilegeCategoryInput;
  title: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (input: CreatePrivilegeCategoryInput) => Promise<{ ok: boolean; error?: string }>;
};

export function CategoryForm({ open, initial, title, submitLabel, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<CreatePrivilegeCategoryInput>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyTouched = useRef(false);

  useEffect(() => {
    if (!open) return;
    setForm(initial ?? EMPTY);
    keyTouched.current = Boolean(initial?.key);
    setError(null);
  }, [open]);

  if (!open) return null;

  const set = <K extends keyof CreatePrivilegeCategoryInput>(
    key: K,
    value: CreatePrivilegeCategoryInput[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLabelChange = (label: string) => {
    set("label", label);
    if (!keyTouched.current) {
      set(
        "key",
        label
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "")
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) {
      setError("Label is required.");
      return;
    }
    if (!form.key.trim()) {
      setError("Key is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await onSubmit(form);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save category.");
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/50 backdrop-blur-sm"
      onClick={() => {
        if (!saving) onClose();
      }}
      role="presentation"
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-cream-300 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="px-6 py-5 border-b border-cream-200">
          <h3 className="text-forest font-semibold text-lg">{title}</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Label *</span>
            <input
              required
              value={form.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Health & Wellness"
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Key *</span>
            <input
              required
              value={form.key}
              onChange={(e) => {
                keyTouched.current = true;
                set("key", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
              }}
              placeholder="health"
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm font-mono text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <p className="text-[11px] text-ink-muted mt-1">Lowercase slug — used in URLs/filters</p>
          </label>
          <div>
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Color classes</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => set("color", preset.value)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded border font-medium transition-all",
                    preset.value,
                    form.color === preset.value && "ring-2 ring-primary ring-offset-1"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              value={form.color}
              onChange={(e) => set("color", e.target.value)}
              className="mt-2 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-xs font-mono text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <div className="mt-2">
              <span className={cn("text-xs px-2.5 py-1 rounded border", form.color)}>Preview</span>
            </div>
          </div>
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Sort order</span>
            <input
              type="number"
              value={form.sortOrder ?? 0}
              onChange={(e) => set("sortOrder", Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
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
            {saving ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export function categoryToFormInput(c: PrivilegeCategory): CreatePrivilegeCategoryInput {
  return {
    label: c.label,
    key: c.key,
    color: c.color,
    sortOrder: c.sortOrder ?? 0,
  };
}
