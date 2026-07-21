"use client";

import { useEffect, useRef, useState } from "react";
import type { CreatePartnerInput } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActiveToggle } from "./active-toggle";
import { ImageUploadField } from "./image-upload-field";

type Props = {
  open: boolean;
  initial?: CreatePartnerInput;
  title: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (input: CreatePartnerInput, logoFile?: File | null) => Promise<{ ok: boolean; error?: string }>;
};

const EMPTY: CreatePartnerInput = {
  name: "",
  logoUrl: "",
  websiteUrl: "",
  description: "",
  isActive: true,
  sortOrder: 0,
};

export function AddPartnerForm({
  open,
  initial,
  title,
  submitLabel,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<CreatePartnerInput>(initial ?? EMPTY);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoFileRef = useRef<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogoFileChange = (file: File | null) => {
    logoFileRef.current = file;
    setLogoFile(file);
  };

  // Reset only when the modal opens — not on every parent re-render (initial is a new object each time).
  useEffect(() => {
    if (!open) return;
    setForm(initial ?? EMPTY);
    logoFileRef.current = null;
    setLogoFile(null);
    setError(null);
  }, [open]);

  if (!open) return null;

  const set = <K extends keyof CreatePartnerInput>(key: K, value: CreatePartnerInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Partner name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await onSubmit(form, logoFileRef.current ?? logoFile);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save partner.");
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
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Name *</span>
            <input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <ImageUploadField
            label="Logo"
            hint="JPEG, PNG, WebP, or GIF — max 500 KB"
            maxSizeBytes={500 * 1024}
            currentUrl={form.logoUrl || undefined}
            disabled={saving}
            onFileChange={handleLogoFileChange}
          />
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Website URL</span>
            <input
              value={form.websiteUrl ?? ""}
              onChange={(e) => set("websiteUrl", e.target.value)}
              placeholder="https://..."
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Description</span>
            <textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <label className="self-end pb-2 flex flex-col gap-3">
            <span className="text-ink-muted text-xs font-semibold tracking-wid">Set this partner as active or inactive also effect it&apos;s privileges.</span>
            <ActiveToggle
              checked={form.isActive ?? true}
              onChange={(checked) => set("isActive", checked)}
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
            className={cn("btn-primary text-sm px-5 py-2 rounded-xl font-semibold", saving && "opacity-60")}
          >
            {saving ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
