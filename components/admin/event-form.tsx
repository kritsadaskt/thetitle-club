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
  sameNameAsEvent: boolean;
  sameScheduleAsEvent: boolean;
};

type FormState = {
  title: string;
  slug: string;
  description: string;
  isActive: boolean;
  multiVenue: boolean;
  /** Main event schedule — venues can inherit via “Same as main event”. */
  mainStartsAt: string;
  mainEndsAt: string;
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
    sameNameAsEvent: true,
    sameScheduleAsEvent: true,
    ...overrides,
  };
}

const EMPTY: FormState = {
  title: "",
  slug: "",
  description: "",
  isActive: true,
  multiVenue: false,
  mainStartsAt: "",
  mainEndsAt: "",
  venues: [emptyVenue({ name: "", slug: "main", slugTouched: true })],
};

function fromEvent(event?: ClubEvent): FormState {
  if (!event) return EMPTY;

  const primary = event.venues[0];
  const mainStartsAt = primary ? toDatetimeLocalValue(primary.startsAt) : "";
  const mainEndsAt = primary?.endsAt ? toDatetimeLocalValue(primary.endsAt) : "";

  const venues =
    event.venues.length > 0
      ? event.venues.map((venue, index) => {
          const startsAt = toDatetimeLocalValue(venue.startsAt);
          const endsAt = venue.endsAt ? toDatetimeLocalValue(venue.endsAt) : "";
          const sameNameAsEvent = venue.name.trim() === event.title.trim();
          const sameScheduleAsEvent =
            startsAt === mainStartsAt && endsAt === mainEndsAt;
          return emptyVenue({
            key: venue.id,
            id: venue.id,
            name: venue.name,
            slug: venue.slug || (index === 0 ? "main" : `location-${index + 1}`),
            slugTouched: true,
            description: venue.description,
            location: venue.location,
            startsAt,
            endsAt,
            bannerImage: venue.bannerImage,
            sameNameAsEvent,
            sameScheduleAsEvent,
          });
        })
      : [emptyVenue({ slug: "main", slugTouched: true })];

  return {
    title: event.title,
    slug: event.slug,
    description: event.description,
    isActive: event.isActive,
    multiVenue: venues.length > 1,
    mainStartsAt,
    mainEndsAt,
    venues,
  };
}

function SameAsMainCheckbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-cream-400 text-primary focus:ring-primary/30"
      />
      <span className="text-[11px] text-ink-muted font-medium">Same as main event</span>
    </label>
  );
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

  const setEventTitle = (nextTitle: string) => {
    setForm((prev) => ({
      ...prev,
      title: nextTitle,
      slug: slugTouched ? prev.slug : slugifyEventTitle(nextTitle),
      venues: prev.venues.map((venue) =>
        venue.sameNameAsEvent
          ? {
              ...venue,
              name: nextTitle,
              slug: venue.slugTouched ? venue.slug : slugifyEventTitle(nextTitle) || venue.slug,
            }
          : venue
      ),
    }));
  };

  const setMainSchedule = (patch: { mainStartsAt?: string; mainEndsAt?: string }) => {
    setForm((prev) => {
      const mainStartsAt = patch.mainStartsAt ?? prev.mainStartsAt;
      const mainEndsAt = patch.mainEndsAt ?? prev.mainEndsAt;
      return {
        ...prev,
        mainStartsAt,
        mainEndsAt,
        venues: prev.venues.map((venue) =>
          venue.sameScheduleAsEvent
            ? { ...venue, startsAt: mainStartsAt, endsAt: mainEndsAt }
            : venue
        ),
      };
    });
  };

  const setSameNameAsEvent = (key: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      venues: prev.venues.map((venue, index) => {
        if (venue.key !== key) return venue;
        if (!checked) return { ...venue, sameNameAsEvent: false };
        const nextSlug =
          venue.slugTouched && venue.slug
            ? venue.slug
            : index === 0
              ? "main"
              : `location-${index + 1}`;
        return {
          ...venue,
          sameNameAsEvent: true,
          name: prev.title,
          slug: nextSlug,
          slugTouched: true,
        };
      }),
    }));
  };

  const setSameScheduleAsEvent = (key: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      venues: prev.venues.map((venue) => {
        if (venue.key !== key) return venue;
        if (!checked) return { ...venue, sameScheduleAsEvent: false };
        return {
          ...venue,
          sameScheduleAsEvent: true,
          startsAt: prev.mainStartsAt,
          endsAt: prev.mainEndsAt,
        };
      }),
    }));
  };

  const addVenue = () => {
    setForm((prev) => {
      const index = prev.venues.length;
      return {
        ...prev,
        multiVenue: true,
        venues: [
          ...prev.venues,
          emptyVenue({
            name: prev.title,
            slug: `location-${index + 1}`,
            slugTouched: true,
            startsAt: prev.mainStartsAt,
            endsAt: prev.mainEndsAt,
            sameNameAsEvent: true,
            sameScheduleAsEvent: true,
          }),
        ],
      };
    });
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

  const resolveVenueName = (venue: VenueFormState) =>
    venue.sameNameAsEvent ? form.title.trim() : venue.name.trim();

  const resolveVenueStartsAt = (venue: VenueFormState) =>
    venue.sameScheduleAsEvent ? form.mainStartsAt : venue.startsAt;

  const resolveVenueEndsAt = (venue: VenueFormState) =>
    venue.sameScheduleAsEvent ? form.mainEndsAt : venue.endsAt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Event title is required.");
      return;
    }
    if (!form.mainStartsAt) {
      setError("Main event start time is required.");
      return;
    }
    if (form.mainEndsAt && form.mainEndsAt < form.mainStartsAt) {
      setError("Main event end time must be after the start time.");
      return;
    }

    const venuesToSave = form.multiVenue ? form.venues : form.venues.slice(0, 1);
    if (venuesToSave.length === 0) {
      setError("Add at least one location.");
      return;
    }

    for (const venue of venuesToSave) {
      const name = resolveVenueName(venue);
      const startsAt = resolveVenueStartsAt(venue);
      const endsAt = resolveVenueEndsAt(venue);
      if (!name) {
        setError("Each location needs a name (or tick Same as main event).");
        return;
      }
      if (!startsAt) {
        setError(`Start time is required for “${name || "location"}”.`);
        return;
      }
      if (endsAt && endsAt < startsAt) {
        setError(`End time must be after the start time for “${name}”.`);
        return;
      }
    }

    const venues: CreateEventVenueInput[] = venuesToSave.map((venue, index) => {
      const name = resolveVenueName(venue);
      const startsAt = resolveVenueStartsAt(venue);
      const endsAt = resolveVenueEndsAt(venue);
      return {
        id: venue.id,
        name,
        slug: ensureVenueSlug(name, venue.slug || (index === 0 ? "main" : `location-${index + 1}`)),
        description: venue.description,
        location: venue.location,
        bannerImage: venue.bannerImage || undefined,
        startsAt: fromDatetimeLocalValue(startsAt),
        endsAt: endsAt ? fromDatetimeLocalValue(endsAt) : null,
        sortOrder: index,
      };
    });

    const input: CreateEventInput = {
      title: form.title.trim(),
      slug: ensureEventSlug(form.title, form.slug),
      description: form.description,
      isActive: form.isActive,
      venues,
    };

    const files: VenueBannerFiles = { ...bannerFilesRef.current, ...bannerFiles };
    for (const venue of venuesToSave) {
      const name = resolveVenueName(venue);
      const finalSlug = ensureVenueSlug(
        name,
        venue.slug || "venue"
      );
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

  const inputClass =
    "mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60";

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
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
              Title *
            </span>
            <input
              required
              value={form.title}
              onChange={(e) => setEventTitle(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
              Event link slug
            </span>
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugifyEventTitle(e.target.value));
              }}
              placeholder="weekend-brunch"
              className={cn(inputClass, "font-mono")}
            />
            <p className="text-ink-muted text-[11px] mt-1">
              Used in the public hub link. Lowercase letters, numbers, and hyphens.
            </p>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                Main starts *
              </span>
              <input
                required
                type="datetime-local"
                value={form.mainStartsAt}
                onChange={(e) => setMainSchedule({ mainStartsAt: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                Main ends
              </span>
              <input
                type="datetime-local"
                value={form.mainEndsAt}
                onChange={(e) => setMainSchedule({ mainEndsAt: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>
          <p className="text-ink-muted text-[11px] -mt-2">
            Main event schedule (Thailand / ICT). Locations can reuse this with “Same as main event”.
          </p>

          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
              Event overview
            </span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={inputClass}
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

            {(form.multiVenue ? form.venues : form.venues.slice(0, 1)).map((venue, index) => {
              const displayName = venue.sameNameAsEvent ? form.title : venue.name;
              const displayStarts = venue.sameScheduleAsEvent ? form.mainStartsAt : venue.startsAt;
              const displayEnds = venue.sameScheduleAsEvent ? form.mainEndsAt : venue.endsAt;

              return (
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

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                        Name *
                      </span>
                      <SameAsMainCheckbox
                        checked={venue.sameNameAsEvent}
                        onChange={(checked) => setSameNameAsEvent(venue.key, checked)}
                        disabled={saving}
                      />
                    </div>
                    <input
                      required={!venue.sameNameAsEvent}
                      value={displayName}
                      disabled={venue.sameNameAsEvent || saving}
                      onChange={(e) => {
                        const nextName = e.target.value;
                        updateVenue(venue.key, {
                          name: nextName,
                          slug: venue.slugTouched ? venue.slug : slugifyEventTitle(nextName),
                        });
                      }}
                      className={inputClass}
                    />
                  </div>

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
                      className={cn(inputClass, "font-mono")}
                    />
                    {venue.sameNameAsEvent && (
                      <p className="text-ink-muted text-[11px] mt-1">
                        Keep a unique slug when several locations share the event name.
                      </p>
                    )}
                  </label>

                  <label className="block">
                    <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                      Address / place
                    </span>
                    <input
                      value={venue.location}
                      onChange={(e) => updateVenue(venue.key, { location: e.target.value })}
                      className={inputClass}
                    />
                  </label>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                        Schedule *
                      </span>
                      <SameAsMainCheckbox
                        checked={venue.sameScheduleAsEvent}
                        onChange={(checked) => setSameScheduleAsEvent(venue.key, checked)}
                        disabled={saving}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="block">
                        <span className="text-ink-muted text-[11px]">Starts</span>
                        <input
                          required={!venue.sameScheduleAsEvent}
                          type="datetime-local"
                          value={displayStarts}
                          disabled={venue.sameScheduleAsEvent || saving}
                          onChange={(e) => updateVenue(venue.key, { startsAt: e.target.value })}
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="text-ink-muted text-[11px]">Ends</span>
                        <input
                          type="datetime-local"
                          value={displayEnds}
                          disabled={venue.sameScheduleAsEvent || saving}
                          onChange={(e) => updateVenue(venue.key, { endsAt: e.target.value })}
                          className={inputClass}
                        />
                      </label>
                    </div>
                    <p className="text-ink-muted text-[11px] mt-1">Times are in Thailand (ICT).</p>
                  </div>

                  <label className="block">
                    <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                      Location details
                    </span>
                    <textarea
                      rows={3}
                      value={venue.description}
                      onChange={(e) => updateVenue(venue.key, { description: e.target.value })}
                      className={inputClass}
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
              );
            })}

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
