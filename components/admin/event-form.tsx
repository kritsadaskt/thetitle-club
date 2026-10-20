"use client";

import { useEffect, useRef, useState } from "react";
import type { ClubEvent, CreateEventInput } from "@/lib/types";
import { ensureEventSlug, fromDatetimeLocalValue, slugifyEventTitle, toDatetimeLocalValue } from "@/lib/events";
import { cn } from "@/lib/utils";
import { ActiveToggle } from "./active-toggle";
import { ImageUploadField } from "./image-upload-field";

type FormState = {
  title: string;
  slug: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  coverImage: string;
};

type Props = {
  open: boolean;
  event?: ClubEvent;
  title: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (input: CreateEventInput, coverFile?: File | null) => Promise<{ ok: boolean; error?: string }>;
};

const EMPTY: FormState = {
  title: "",
  slug: "",
  description: "",
  location: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
  coverImage: "",
};

function fromEvent(event?: ClubEvent): FormState {
  if (!event) return EMPTY;
  return {
    title: event.title,
    slug: event.slug,
    description: event.description,
    location: event.location,
    startsAt: toDatetimeLocalValue(event.startsAt),
    endsAt: event.endsAt ? toDatetimeLocalValue(event.endsAt) : "",
    isActive: event.isActive,
    coverImage: event.coverImage,
  };
}

export function EventForm({ open, event, title, submitLabel, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const coverFileRef = useRef<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(fromEvent(event));
    setSlugTouched(Boolean(event));
    coverFileRef.current = null;
    setCoverFile(null);
    setError(null);
  }, [open, event]);

  if (!open) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Event title is required.");
      return;
    }
    if (!form.startsAt) {
      setError("Start time is required.");
      return;
    }
    if (form.endsAt && form.endsAt < form.startsAt) {
      setError("End time must be after the start time.");
      return;
    }

    const input: CreateEventInput = {
      title: form.title.trim(),
      slug: ensureEventSlug(form.title, form.slug),
      description: form.description,
      location: form.location,
      startsAt: fromDatetimeLocalValue(form.startsAt),
      endsAt: form.endsAt ? fromDatetimeLocalValue(form.endsAt) : null,
      isActive: form.isActive,
    };

    setSaving(true);
    setError(null);
    const res = await onSubmit(input, coverFileRef.current ?? coverFile);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save event.");
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
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Title *</span>
            <input
              required
              value={form.title}
              onChange={(e) => {
                const nextTitle = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  title: nextTitle,
                  slug: slugTouched ? prev.slug : slugifyEventTitle(nextTitle),
                }));
              }}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Link slug</span>
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugifyEventTitle(e.target.value));
              }}
              placeholder="weekend-brunch"
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <p className="text-ink-muted text-[11px] mt-1">Used in the public link and QR code. Lowercase letters, numbers, and hyphens.</p>
          </label>
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Location</span>
            <input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Starts *</span>
              <input
                required
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => set("startsAt", e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </label>
            <label className="block">
              <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Ends</span>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => set("endsAt", e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </label>
          </div>
          <p className="text-ink-muted text-[11px] -mt-2">Times are in Thailand (ICT).</p>
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Description</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <ImageUploadField
            label="Cover image"
            hint="JPEG, PNG, WebP, or GIF — max 1 MB"
            currentUrl={form.coverImage || undefined}
            disabled={saving}
            onFileChange={(file) => {
              coverFileRef.current = file;
              setCoverFile(file);
            }}
          />
          <ActiveToggle
            checked={form.isActive}
            label={form.isActive ? "Active" : "Archived"}
            onChange={(checked) => set("isActive", checked)}
          />
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
