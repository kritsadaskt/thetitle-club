"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ClubEvent, CreateEventInput, CreateEventVenueInput } from "@/lib/types";
import {
  ensureEventSlug,
  ensureVenueSlug,
  fromDatetimeLocalValue,
  slugifyEventTitle,
  toDatetimeLocalValue,
} from "@/lib/events";
import { cn } from "@/lib/utils";
import type { VenueBannerFiles } from "@/lib/supabase/data";
import { ActiveToggle } from "./active-toggle";
import { ImageUploadField } from "./image-upload-field";

type VenueFormState = {
  key: string;
  id?: string;
  name: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  bannerImage: string;
};

type FormState = {
  title: string;
  slug: string;
  description: string;
  isActive: boolean;
  multiVenue: boolean;
  venues: VenueFormState[];
};

type Props = {
  open: boolean;
  event?: ClubEvent;
  title: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (
    input: CreateEventInput,
    bannerFiles?: VenueBannerFiles
  ) => Promise<{ ok: boolean; error?: string }>;
};

function newVenueKey() {
  return `v-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyVenue(overrides?: Partial<VenueFormState>): VenueFormState {
  return {
    key: newVenueKey(),
    name: "",
    slug: "",
    slugTouched: false,
    description: "",
    location: "",
    startsAt: "",
    endsAt: "",
    bannerImage: "",
    ...overrides,
  };
}

const EMPTY: FormState = {
  title: "",
  slug: "",
  description: "",
  isActive: true,
  multiVenue: false,
  venues: [emptyVenue({ name: "Main", slug: "main", slugTouched: true })],
};

function fromEvent(event?: ClubEvent): FormState {
  if (!event) return EMPTY;
  const venues =
    event.venues.length > 0
      ? event.venues.map((venue) =>
          emptyVenue({
            key: venue.id,
            id: venue.id,
            name: venue.name,
            slug: venue.slug,
            slugTouched: true,
            description: venue.description,
            location: venue.location,
            startsAt: toDatetimeLocalValue(venue.startsAt),
            endsAt: venue.endsAt ? toDatetimeLocalValue(venue.endsAt) : "",
            bannerImage: venue.bannerImage,
          })
        )
      : [emptyVenue({ name: "Main", slug: "main", slugTouched: true })];

  return {
    title: event.title,
    slug: event.slug,
    description: event.description,
    isActive: event.isActive,
    multiVenue: venues.length > 1,
    venues,
  };
}

export function EventForm({ open, event, title, submitLabel, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [bannerFiles, setBannerFiles] = useState<VenueBannerFiles>({});
  const bannerFilesRef = useRef<VenueBannerFiles>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(fromEvent(event));
    setSlugTouched(Boolean(event));
    bannerFilesRef.current = {};
    setBannerFiles({});
    setError(null);
  }, [open, event]);

  if (!open) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateVenue = (key: string, patch: Partial<VenueFormState>) => {
    setForm((prev) => ({
      ...prev,
      venues: prev.venues.map((venue) => (venue.key === key ? { ...venue, ...patch } : venue)),
    }));
  };

  const addVenue = () => {
    setForm((prev) => ({
      ...prev,
      multiVenue: true,
      venues: [...prev.venues, emptyVenue()],
    }));
  };

  const removeVenue = (key: string) => {
    setForm((prev) => {
      if (prev.venues.length <= 1) return prev;
      const venues = prev.venues.filter((venue) => venue.key !== key);
      return { ...prev, venues, multiVenue: venues.length > 1 };
    });
  };

  const setMultiVenue = (multi: boolean) => {
    setForm((prev) => {
      if (multi) {
        return { ...prev, multiVenue: true };
      }
      return {
        ...prev,
        multiVenue: false,
        venues: prev.venues.slice(0, 1),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Event title is required.");
      return;
    }

    const venuesToSave = form.multiVenue ? form.venues : form.venues.slice(0, 1);
    if (venuesToSave.length === 0) {
      setError("Add at least one location.");
      return;
    }

    for (const venue of venuesToSave) {
      if (!venue.name.trim()) {
        setError("Each location needs a name.");
        return;
      }
      if (!venue.startsAt) {
        setError(`Start time is required for “${venue.name.trim() || "location"}”.`);
        return;
      }
      if (venue.endsAt && venue.endsAt < venue.startsAt) {
        setError(`End time must be after the start time for “${venue.name.trim()}”.`);
        return;
      }
    }

    const venues: CreateEventVenueInput[] = venuesToSave.map((venue, index) => ({
      id: venue.id,
      name: venue.name.trim(),
      slug: ensureVenueSlug(venue.name, venue.slug),
      description: venue.description,
      location: venue.location,
      bannerImage: venue.bannerImage || undefined,
      startsAt: fromDatetimeLocalValue(venue.startsAt),
      endsAt: venue.endsAt ? fromDatetimeLocalValue(venue.endsAt) : null,
      sortOrder: index,
    }));

    const input: CreateEventInput = {
      title: form.title.trim(),
      slug: ensureEventSlug(form.title, form.slug),
      description: form.description,
      isActive: form.isActive,
      venues,
    };

    const files: VenueBannerFiles = { ...bannerFilesRef.current, ...bannerFiles };
    // Also index by final slug so uploads match after slugify
    for (const venue of venuesToSave) {
      const finalSlug = ensureVenueSlug(venue.name, venue.slug);
      const file = files[venue.key] ?? files[venue.id ?? ""] ?? files[venue.slug];
      if (file) files[finalSlug] = file;
    }

    setSaving(true);
    setError(null);
    const res = await onSubmit(input, files);
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
        className="bg-white rounded-2xl border border-cream-300 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
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
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Event link slug</span>
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugifyEventTitle(e.target.value));
              }}
              placeholder="weekend-brunch"
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <p className="text-ink-muted text-[11px] mt-1">
              Used in the public hub link. Lowercase letters, numbers, and hyphens.
            </p>
          </label>
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
              Event overview
            </span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>

          <div className="rounded-xl border border-cream-300 bg-cream-50/80 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-forest text-sm font-medium">Locations</p>
                <p className="text-ink-muted text-[11px] mt-0.5">
                  Each location has its own banner, schedule, QR, and registrations.
                </p>
              </div>
              <ActiveToggle
                checked={form.multiVenue}
                label={form.multiVenue ? "Multiple locations" : "Single location"}
                onChange={setMultiVenue}
              />
            </div>

            {(form.multiVenue ? form.venues : form.venues.slice(0, 1)).map((venue, index) => (
              <div
                key={venue.key}
                className="rounded-xl border border-cream-300 bg-white p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                    {form.multiVenue ? `Location ${index + 1}` : "Location"}
                  </p>
                  {form.multiVenue && form.venues.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVenue(venue.key)}
                      className="inline-flex items-center gap-1 text-xs text-red-700 hover:text-red-800"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>
                <label className="block">
                  <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                    Name *
                  </span>
                  <input
                    required
                    value={venue.name}
                    onChange={(e) => {
                      const nextName = e.target.value;
                      updateVenue(venue.key, {
                        name: nextName,
                        slug: venue.slugTouched ? venue.slug : slugifyEventTitle(nextName),
                      });
                    }}
                    className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </label>
                <label className="block">
                  <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                    Location slug
                  </span>
                  <input
                    value={venue.slug}
                    onChange={(e) =>
                      updateVenue(venue.key, {
                        slug: slugifyEventTitle(e.target.value),
                        slugTouched: true,
                      })
                    }
                    className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </label>
                <label className="block">
                  <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                    Address / place
                  </span>
                  <input
                    value={venue.location}
                    onChange={(e) => updateVenue(venue.key, { location: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                      Starts *
                    </span>
                    <input
                      required
                      type="datetime-local"
                      value={venue.startsAt}
                      onChange={(e) => updateVenue(venue.key, { startsAt: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </label>
                  <label className="block">
                    <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                      Ends
                    </span>
                    <input
                      type="datetime-local"
                      value={venue.endsAt}
                      onChange={(e) => updateVenue(venue.key, { endsAt: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </label>
                </div>
                <p className="text-ink-muted text-[11px] -mt-2">Times are in Thailand (ICT).</p>
                <label className="block">
                  <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                    Location details
                  </span>
                  <textarea
                    rows={3}
                    value={venue.description}
                    onChange={(e) => updateVenue(venue.key, { description: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </label>
                <ImageUploadField
                  label="Banner (AW)"
                  hint="JPEG, PNG, WebP, or GIF — max 1 MB"
                  currentUrl={venue.bannerImage || undefined}
                  disabled={saving}
                  onFileChange={(file) => {
                    const next = {
                      ...bannerFilesRef.current,
                      [venue.key]: file,
                      ...(venue.id ? { [venue.id]: file } : {}),
                      [venue.slug || venue.key]: file,
                    };
                    bannerFilesRef.current = next;
                    setBannerFiles(next);
                  }}
                />
              </div>
            ))}

            {form.multiVenue && (
              <button
                type="button"
                onClick={addVenue}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-cream-400 px-3 py-2 text-xs text-forest hover:bg-white"
              >
                <Plus size={12} /> Add location
              </button>
            )}
          </div>

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
