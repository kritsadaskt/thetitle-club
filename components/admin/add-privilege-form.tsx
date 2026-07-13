"use client";

import { useEffect, useRef, useState } from "react";
import { fetchAllPrivilegeCategories } from "@/lib/supabase/data";
import type { CreatePrivilegeInput, Privilege, PrivilegeCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ImageUploadField } from "./image-upload-field";

const EMPTY: CreatePrivilegeInput = {
  title: "",
  summary: "",
  description: "",
  terms: "",
  howToRedeem: "",
  categoryId: 0,
  discountLabel: "",
  coverImage: "",
  validFrom: new Date().toISOString().slice(0, 10),
  validUntil: "",
  isActive: true,
  sortOrder: 0,
  codeMode: "shared",
};

export function privilegeToFormInput(p: Privilege): CreatePrivilegeInput {
  return {
    title: p.title,
    summary: p.summary,
    description: p.description,
    terms: p.terms,
    howToRedeem: p.howToRedeem,
    categoryId: p.categoryId,
    discountLabel: p.discountLabel,
    coverImage: p.coverImage,
    validFrom: p.validFrom,
    validUntil: p.validUntil ?? "",
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    codeMode: p.codeMode,
  };
}

type Props = {
  open: boolean;
  partnerName: string;
  mode?: "create" | "edit";
  initial?: CreatePrivilegeInput;
  title?: string;
  submitLabel?: string;
  hideCover?: boolean;
  hideCodeMode?: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePrivilegeInput, coverFile?: File | null) => Promise<{ ok: boolean; error?: string }>;
};

export function AddPrivilegeForm({
  open,
  partnerName,
  mode = "create",
  initial,
  title: formTitle,
  submitLabel,
  hideCover = false,
  hideCodeMode = false,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<CreatePrivilegeInput>(initial ?? EMPTY);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const coverFileRef = useRef<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<PrivilegeCategory[]>([]);

  const handleCoverFileChange = (file: File | null) => {
    coverFileRef.current = file;
    setCoverFile(file);
  };

  useEffect(() => {
    if (!open) return;
    void fetchAllPrivilegeCategories().then((rows) => {
      setCategories(rows);
      if (mode === "edit" && initial) {
        setForm(initial);
      } else {
        const defaultCategoryId = rows[0]?.id ?? 0;
        setForm({ ...EMPTY, validFrom: new Date().toISOString().slice(0, 10), categoryId: defaultCategoryId });
      }
    });
    coverFileRef.current = null;
    setCoverFile(null);
    setError(null);
  }, [open]);

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
    if (!form.categoryId) {
      setError("Please select a category.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await onSubmit(form, coverFileRef.current ?? coverFile);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? (mode === "edit" ? "Could not save privilege." : "Could not create privilege."));
      return;
    }
    onClose();
  };

  const heading = formTitle ?? (mode === "edit" ? "Edit Privilege" : "Add Privilege");
  const buttonLabel = submitLabel ?? (mode === "edit" ? "Save Changes" : "Create Privilege");

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
        className="bg-white rounded-2xl border border-cream-300 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="px-6 py-5 border-b border-cream-200">
          <h3 className="text-forest font-semibold text-lg">{heading}</h3>
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
              value={form.categoryId || ""}
              onChange={(e) => set("categoryId", Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {categories.length === 0 ? (
                <option value="">No categories — add one in Admin</option>
              ) : (
                categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))
              )}
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
          {!hideCover && (
            <div className="sm:col-span-2">
              <ImageUploadField
                label="Cover image (thumbnail)"
                hint="JPEG, PNG, WebP, or GIF — max 1 MB"
                maxSizeBytes={1024 * 1024}
                disabled={saving}
                onFileChange={handleCoverFileChange}
              />
            </div>
          )}
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
          {!hideCodeMode && (
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
          )}
          <label className={cn("flex items-end gap-2 pb-2 text-sm text-forest", hideCodeMode && "sm:col-span-2")}>
            <input
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={(e) => set("isActive", e.target.checked)}
              className="rounded border-cream-300"
            />
            Active
          </label>
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
            {saving ? "Saving…" : buttonLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
