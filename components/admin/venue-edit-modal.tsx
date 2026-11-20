"use client";

import { useEffect, useState } from "react";
import {
  ensureVenueSlug,
  fromDatetimeLocalValue,
  slugifyEventTitle,
  toDatetimeLocalValue,
} from "@/lib/events";
import { buildI18nPayload, type I18nLocaleMap } from "@/lib/i18n";
import { updateEventWithVenues, type VenueBannerFiles } from "@/lib/supabase/data";
import type { ClubEvent, CreateEventVenueInput, EventVenue } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ImageUploadField } from "./image-upload-field";
import { LocaleTextFields, getLocaleField, setLocaleField } from "./locale-text-fields";
import { VenueSurveyEditor } from "./venue-survey-editor";

const inputClass =
  "mt-1 w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60";

function cloneI18n(i18n?: I18nLocaleMap): I18nLocaleMap {
  return {
    ...(i18n?.th ? { th: { ...i18n.th } } : {}),
    ...(i18n?.ru ? { ru: { ...i18n.ru } } : {}),
  };
}

function venueToInput(venue: EventVenue): CreateEventVenueInput {
  return {
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    description: venue.description,
    location: venue.location,
    bannerImage: venue.bannerImage || undefined,
    startsAt: venue.startsAt,
    endsAt: venue.endsAt ?? null,
    sortOrder: venue.sortOrder,
    i18n: cloneI18n(venue.i18n),
  };
}

type FormState = {
  name: string;
  slug: string;
  slugTouched: boolean;
  location: string;
  description: string;
  startsAt: string;
  endsAt: string;
  i18n: I18nLocaleMap;
};

function fromVenue(venue: EventVenue): FormState {
  return {
    name: venue.name,
    slug: venue.slug,
    slugTouched: true,
    location: venue.location,
    description: venue.description,
    startsAt: toDatetimeLocalValue(venue.startsAt),
    endsAt: venue.endsAt ? toDatetimeLocalValue(venue.endsAt) : "",
    i18n: cloneI18n(venue.i18n),
  };
}

type Props = {
  open: boolean;
  event: ClubEvent;
  venue: EventVenue;
  onClose: () => void;
  onSaved: (event: ClubEvent) => void;
};

export function VenueEditModal({ open, event, venue, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(() => fromVenue(venue));
  const [bannerFile, setBannerFile] = useState<File | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(fromVenue(venue));
    setBannerFile(undefined);
    setError(null);
  }, [open, venue]);

  if (!open) return null;

  const setTranslation = (locale: "th" | "ru", field: string, value: string) => {
    setForm((prev) => ({ ...prev, i18n: setLocaleField(prev.i18n, locale, field, value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.startsAt) {
      setError("Start time is required.");
      return;
    }

    const startsAt = fromDatetimeLocalValue(form.startsAt);
    const endsAt = form.endsAt ? fromDatetimeLocalValue(form.endsAt) : null;
    if (endsAt && endsAt <= startsAt) {
      setError("End time must be after the start time.");
      return;
    }

    const edited: CreateEventVenueInput = {
      id: venue.id,
      name: form.name.trim(),
      slug: ensureVenueSlug(form.name, form.slug),
      description: form.description.trim() || undefined,
      location: form.location.trim() || undefined,
      bannerImage: venue.bannerImage || undefined,
      startsAt,
      endsAt,
      sortOrder: venue.sortOrder,
      i18n: buildI18nPayload({ th: form.i18n.th, ru: form.i18n.ru }),
    };

    const venues = event.venues.map((v) => (v.id === venue.id ? edited : venueToInput(v)));

    setSaving(true);
    setError(null);
    const bannerFiles: VenueBannerFiles | undefined =
      bannerFile === undefined
        ? undefined
        : {
            [venue.id]: bannerFile,
            [edited.slug]: bannerFile,
          };

    const res = await updateEventWithVenues(
      event.id,
      {
        title: event.title,
        slug: event.slug,
        description: event.description,
        isActive: event.isActive,
        i18n: event.i18n,
        venues,
      },
      bannerFiles
    );
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved(res.data);
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
        <div className="px-6 py-5 border-b border-cream-200 sticky top-0 bg-white z-10">
          <h3 className="text-forest font-semibold text-lg">Edit location</h3>
          <p className="text-ink-muted text-xs mt-1 truncate">{venue.name}</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
              Name *
            </span>
            <input
              required
              value={form.name}
              disabled={saving}
              onChange={(e) => {
                const nextName = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  name: nextName,
                  slug: prev.slugTouched ? prev.slug : slugifyEventTitle(nextName),
                }));
              }}
              className={inputClass}
            />
          </label>
          <LocaleTextFields
            label="Name"
            valueTh={getLocaleField(form.i18n, "th", "name")}
            valueRu={getLocaleField(form.i18n, "ru", "name")}
            onChangeTh={(v) => setTranslation("th", "name", v)}
            onChangeRu={(v) => setTranslation("ru", "name", v)}
            disabled={saving}
          />

          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
              Location slug
            </span>
            <input
              value={form.slug}
              disabled={saving}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  slug: slugifyEventTitle(e.target.value),
                  slugTouched: true,
                }))
              }
              className={cn(inputClass, "font-mono")}
            />
          </label>

          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
              Address / place
            </span>
            <input
              value={form.location}
              disabled={saving}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              className={inputClass}
            />
          </label>
          <LocaleTextFields
            label="Address / place"
            valueTh={getLocaleField(form.i18n, "th", "location")}
            valueRu={getLocaleField(form.i18n, "ru", "location")}
            onChangeTh={(v) => setTranslation("th", "location", v)}
            onChangeRu={(v) => setTranslation("ru", "location", v)}
            disabled={saving}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                Starts *
              </span>
              <input
                required
                type="datetime-local"
                value={form.startsAt}
                disabled={saving}
                onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                Ends
              </span>
              <input
                type="datetime-local"
                value={form.endsAt}
                disabled={saving}
                onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                className={inputClass}
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
              value={form.description}
              disabled={saving}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className={inputClass}
            />
          </label>
          <LocaleTextFields
            label="Location details"
            multiline
            rows={3}
            valueTh={getLocaleField(form.i18n, "th", "description")}
            valueRu={getLocaleField(form.i18n, "ru", "description")}
            onChangeTh={(v) => setTranslation("th", "description", v)}
            onChangeRu={(v) => setTranslation("ru", "description", v)}
            disabled={saving}
          />

          <ImageUploadField
            label="Banner (AW)"
            hint="JPEG, PNG, WebP, or GIF — max 1 MB"
            currentUrl={venue.bannerImage || undefined}
            disabled={saving}
            onFileChange={(file) => setBannerFile(file)}
          />

          <VenueSurveyEditor event={event} venue={venue} />
        </div>

        <div className="px-6 py-4 border-t border-cream-200 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl border border-cream-300 px-4 py-2 text-sm text-forest hover:bg-cream-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={cn(
              "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-forest",
              saving && "opacity-60"
            )}
          >
            {saving ? "Saving…" : "Save location"}
          </button>
        </div>
      </form>
    </div>
  );
}
