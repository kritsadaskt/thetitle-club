"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Mail, Pencil } from "lucide-react";
import { absoluteAppUrl } from "@/lib/app-url";
import {
  eventEarliestStartsAt,
  eventLatestEndsAt,
  eventLocationSummary,
  formatEventDateTime,
  formatEventSchedule,
  venuePublicPath,
} from "@/lib/events";
import {
  fetchEventRegistrationLogs,
  fetchEventRegistrants,
  updateEventWithVenues,
  type VenueBannerFiles,
} from "@/lib/supabase/data";
import type {
  ClubEvent,
  CreateEventInput,
  EventRegistrant,
  EventRegistrationLog,
  EventVenue,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActiveToggle } from "./active-toggle";
import { EventForm } from "./event-form";
import { VenueQrCard } from "./venue-qr-card";

type Props = {
  event: ClubEvent;
  onBack: () => void;
  onEventUpdated: (event: ClubEvent) => void;
};

/** Prefer address/place so chips stay distinct when venue name matches the event title. */
function venueLocationLabel(venue: EventVenue): string {
  return venue.location.trim() || venue.slug || venue.name;
}

export function EventDetail({ event, onBack, onEventUpdated }: Props) {
  const [registrants, setRegistrants] = useState<EventRegistrant[]>([]);
  const [logs, setLogs] = useState<EventRegistrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [venueFilter, setVenueFilter] = useState<string>("all");
  const [resendTarget, setResendTarget] = useState<EventRegistrant | null>(null);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRegistrants = useCallback(async () => {
    setLoading(true);
    const [result, history] = await Promise.all([
      fetchEventRegistrants(event.id),
      fetchEventRegistrationLogs(event.id),
    ]);
    setRegistrants(result.rows);
    setLogs(history.rows);
    setError(result.error ?? history.error ?? null);
    setLoading(false);
  }, [event.id]);

  useEffect(() => {
    void loadRegistrants();
  }, [loadRegistrants]);

  const countsByVenue = useMemo(() => {
    const map = new Map<string, number>();
    for (const venue of event.venues) map.set(venue.id, 0);
    for (const row of registrants) {
      map.set(row.venueId, (map.get(row.venueId) ?? 0) + 1);
    }
    return map;
  }, [event.venues, registrants]);

  const filteredRegistrants =
    venueFilter === "all" ? registrants : registrants.filter((row) => row.venueId === venueFilter);

  const filteredLogs =
    venueFilter === "all" ? logs : logs.filter((row) => row.venueId === venueFilter);

  const venueLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const venue of event.venues) map.set(venue.id, venueLocationLabel(venue));
    return map;
  }, [event.venues]);

  const startsAt = eventEarliestStartsAt(event);
  const endsAt = eventLatestEndsAt(event);
  const locationSummary = eventLocationSummary(event);

  const handleArchive = async (isActive: boolean) => {
    setError(null);
    setArchiving(true);
    const res = await updateEventWithVenues(event.id, { isActive });
    setArchiving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onEventUpdated(res.data);
  };

  const handleUpdate = async (input: CreateEventInput, bannerFiles?: VenueBannerFiles) => {
    const res = await updateEventWithVenues(event.id, input, bannerFiles);
    if (!res.ok) return { ok: false, error: res.error };
    onEventUpdated(res.data);
    return { ok: true };
  };

  const resendConfirmEmail = async () => {
    if (!resendTarget) return;
    setResending(true);
    setError(null);
    setResendNotice(null);
    try {
      const res = await fetch(`/club/api/events/${event.id}/resend-confirm-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: resendTarget.memberId }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string; email?: string }
        | null;

      if (!res.ok) {
        setError(body?.error ?? "Could not resend confirmation email.");
        return;
      }

      setResendNotice(
        `Confirmation email sent to ${resendTarget.fullName || resendTarget.memberCode}${
          body?.email || resendTarget.email ? ` (${body?.email || resendTarget.email})` : ""
        }.`
      );
      setResendTarget(null);
    } catch {
      setError("Could not resend confirmation email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const exportRegistrants = async () => {
    const XLSX = await import("xlsx");
    const book = XLSX.utils.book_new();
    const usedSheetNames = new Set<string>(["All", "Summary", "History"]);

    /** Excel sheet names: max 31 chars, unique, no \ / ? * [ ] */
    const uniqueSheetName = (raw: string) => {
      const cleaned = raw.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim() || "Venue";
      let base = cleaned.slice(0, 31);
      if (!usedSheetNames.has(base)) {
        usedSheetNames.add(base);
        return base;
      }
      for (let n = 2; n < 1000; n++) {
        const suffix = ` (${n})`;
        const candidate = `${cleaned.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
        if (!usedSheetNames.has(candidate)) {
          usedSheetNames.add(candidate);
          return candidate;
        }
      }
      const fallback = `Venue-${usedSheetNames.size}`.slice(0, 31);
      usedSheetNames.add(fallback);
      return fallback;
    };

    const allRows = [
      ["Location", "Member ID", "Name", "Email", "Phone", "Registered at"],
      ...registrants.map((row) => [
        venueLabelById.get(row.venueId) || row.venueName,
        row.memberCode,
        row.fullName,
        row.email,
        row.phone,
        formatEventDateTime(row.registeredAt),
      ]),
    ];
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(allRows), "All");

    const summaryRows = [
      ["Location", "Registrations"],
      ...event.venues.map((venue) => [
        venueLocationLabel(venue),
        countsByVenue.get(venue.id) ?? 0,
      ]),
      ["Total", registrants.length],
    ];
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");

    for (const venue of event.venues) {
      const venueRows = registrants.filter((row) => row.venueId === venue.id);
      const sheet = [
        ["Member ID", "Name", "Email", "Phone", "Registered at"],
        ...venueRows.map((row) => [
          row.memberCode,
          row.fullName,
          row.email,
          row.phone,
          formatEventDateTime(row.registeredAt),
        ]),
      ];
      const preferred = venueLocationLabel(venue);
      const sheetName = uniqueSheetName(preferred);
      XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(sheet), sheetName);
    }

    const historyRows = [
      ["Time", "Location", "Member ID", "Name", "Action"],
      ...logs.map((row) => [
        formatEventDateTime(row.occurredAt),
        (row.venueId && venueLabelById.get(row.venueId)) || row.venueName,
        row.memberCode,
        row.fullName,
        row.action === "registered" ? "Registered" : "Cancelled",
      ]),
    ];
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(historyRows), "History");
    XLSX.writeFile(book, `${event.slug}-registrations.xlsx`);
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-ink-muted hover:text-forest text-sm mb-6 transition-colors font-medium"
      >
        <ArrowLeft size={14} /> Back to Events
      </button>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {resendNotice && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {resendNotice}
        </div>
      )}

      <div className="bg-white border border-cream-300 rounded-2xl p-5 mb-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-forest font-semibold text-xl break-words">{event.title}</h2>
            {startsAt && (
              <p className="text-ink-muted text-sm mt-1">{formatEventSchedule(startsAt, endsAt)}</p>
            )}
            {locationSummary && <p className="text-ink-light text-sm mt-1">{locationSummary}</p>}
          </div>
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cream-300 px-3 py-2 text-xs text-forest hover:bg-cream-100"
          >
            <Pencil size={12} /> Edit
          </button>
        </div>
        {event.description && (
          <p className="text-ink-light text-sm mt-4 whitespace-pre-wrap">{event.description}</p>
        )}
        <div className="mt-5">
          <ActiveToggle
            checked={event.isActive}
            label={event.isActive ? "Active" : "Archived"}
            onChange={(checked) => {
              if (!archiving) void handleArchive(checked);
            }}
          />
          {!event.isActive && (
            <p className="text-ink-muted text-xs mt-2">
              Archived events are hidden from the member dashboard, but location links and QR codes still
              work for registration.
            </p>
          )}
        </div>
      </div>

      <h3 className="text-ink-muted text-xs tracking-[2px] uppercase font-semibold mb-3">
        Locations &amp; QR ({event.venues.length})
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {event.venues.map((venue) => {
          const shareUrl = absoluteAppUrl(venuePublicPath(event.slug, venue.slug));
          const count = countsByVenue.get(venue.id) ?? 0;
          return (
            <div
              key={venue.id}
              className="bg-white border border-cream-300 rounded-2xl p-4 shadow-card flex flex-col sm:flex-row gap-4"
            >
              <VenueQrCard
                value={shareUrl}
                title={venue.name}
                fileBaseName={`${event.slug}__${venue.slug}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-forest font-medium text-sm">{venue.name}</p>
                <p className="text-ink-muted text-xs mt-1">
                  {formatEventSchedule(venue.startsAt, venue.endsAt)}
                </p>
                {venue.location && (
                  <p className="text-ink-light text-xs mt-1 truncate">{venue.location}</p>
                )}
                <p className="text-ink-muted text-xs mt-2">
                  {count} registration{count === 1 ? "" : "s"}
                </p>
                <p className="text-[11px] text-ink-muted mt-2 break-all">{shareUrl}</p>
                <p className="text-[10px] text-ink-muted mt-2">
                  Click the QR to open 1000×1000 in a new tab. Save PNG or copy image for print.
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-ink-muted text-xs tracking-[2px] uppercase font-semibold">
          Registrations (
          {venueFilter === "all"
            ? registrants.length
            : (countsByVenue.get(venueFilter) ?? 0)}
          {venueFilter !== "all" ? ` / ${registrants.length}` : ""})
        </h3>
        <button
          type="button"
          onClick={() => void exportRegistrants()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cream-300 bg-white px-3 py-2 text-xs text-forest hover:bg-cream-100"
        >
          <Download size={12} /> Export Excel
        </button>
      </div>

      {event.venues.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter by location">
          <button
            type="button"
            role="tab"
            aria-selected={venueFilter === "all"}
            onClick={() => setVenueFilter("all")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
              venueFilter === "all"
                ? "border-primary bg-primary/15 text-primary-dark"
                : "border-cream-300 bg-cream-50 text-forest hover:bg-cream-100"
            )}
          >
            All ({registrants.length})
          </button>
          {event.venues.map((venue) => {
            const selected = venueFilter === venue.id;
            const count = countsByVenue.get(venue.id) ?? 0;
            return (
              <button
                key={venue.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setVenueFilter(venue.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors max-w-full",
                  selected
                    ? "border-primary bg-primary/15 text-primary-dark"
                    : "border-cream-300 bg-cream-50 text-forest hover:bg-cream-100"
                )}
              >
                <span className="truncate">{venueLocationLabel(venue)}</span>
                <span className="opacity-70"> ({count})</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-white border border-cream-300 rounded-2xl overflow-hidden shadow-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredRegistrants.length === 0 ? (
          <p className="text-ink-muted text-sm text-center py-12">No one has registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-300 bg-cream-100">
                  {["Location", "Member ID", "Name", "Email", "Phone", "Registered", ""].map(
                    (heading) => (
                      <th
                        key={heading || "actions"}
                        className="px-5 py-3.5 text-left text-ink-muted text-xs font-semibold tracking-wide"
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {filteredRegistrants.map((row) => (
                  <tr key={row.id} className="hover:bg-cream-100/60">
                    <td className="px-5 py-3.5 text-ink-light text-xs">
                      {venueLabelById.get(row.venueId) || row.venueName || "—"}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-ink-light">
                      {row.memberCode || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-forest font-medium">{row.fullName || "—"}</td>
                    <td className="px-5 py-3.5 text-ink-muted text-xs">{row.email || "—"}</td>
                    <td className="px-5 py-3.5 text-ink-muted text-xs">{row.phone || "—"}</td>
                    <td className="px-5 py-3.5 text-ink-muted text-xs whitespace-nowrap">
                      {formatEventDateTime(row.registeredAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setResendNotice(null);
                          setResendTarget(row);
                        }}
                        disabled={!row.email || !row.memberId}
                        title={!row.email ? "No email on profile" : "Resend confirmation email"}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-cream-300 bg-white px-2.5 py-1.5 text-xs text-forest hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Mail size={12} /> Resend
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h3 className="text-ink-muted text-xs tracking-[2px] uppercase font-semibold mt-8 mb-3">
        Registration history ({filteredLogs.length})
      </h3>
      <div className="bg-white border border-cream-300 rounded-2xl overflow-hidden shadow-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <p className="text-ink-muted text-sm text-center py-12">No registration activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-300 bg-cream-100">
                  {["Time", "Location", "Member ID", "Name", "Action"].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3.5 text-left text-ink-muted text-xs font-semibold tracking-wide"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {filteredLogs.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3.5 text-ink-muted text-xs whitespace-nowrap">
                      {formatEventDateTime(row.occurredAt)}
                    </td>
                    <td className="px-5 py-3.5 text-ink-light text-xs">
                      {(row.venueId && venueLabelById.get(row.venueId)) || row.venueName || "—"}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-ink-light">
                      {row.memberCode || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-forest font-medium">{row.fullName || "—"}</td>
                    <td className="px-5 py-3.5 text-xs">
                      <span
                        className={
                          row.action === "registered" ? "text-emerald-700" : "text-ink-muted"
                        }
                      >
                        {row.action === "registered" ? "Registered" : "Cancelled"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EventForm
        open={showEdit}
        event={event}
        title="Edit event"
        submitLabel="Save changes"
        onClose={() => setShowEdit(false)}
        onSubmit={handleUpdate}
      />

      {resendTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/50 backdrop-blur-sm"
          onClick={() => {
            if (!resending) setResendTarget(null);
          }}
          role="presentation"
        >
          <div
            className="bg-white rounded-2xl border border-cream-300 shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="resend-confirm-title"
          >
            <div className="px-6 py-5 border-b border-cream-200">
              <h3 id="resend-confirm-title" className="text-forest font-semibold text-lg">
                Resend confirmation email?
              </h3>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-ink-light text-sm leading-relaxed">
                Send the confirmation email for{" "}
                <span className="font-semibold text-forest">{event.title}</span>
                {resendTarget.venueName ? (
                  <>
                    {" "}
                    at <span className="font-semibold text-forest">{resendTarget.venueName}</span>
                  </>
                ) : null}{" "}
                again to{" "}
                <span className="font-semibold text-forest">
                  {resendTarget.fullName || resendTarget.memberCode}
                </span>
                {resendTarget.email ? (
                  <>
                    {" "}
                    at <span className="font-medium text-forest">{resendTarget.email}</span>
                  </>
                ) : null}
                ?
              </p>
              <p className="text-ink-muted text-xs">Only this member will receive the email.</p>
            </div>
            <div className="px-6 py-4 border-t border-cream-200 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setResendTarget(null)}
                disabled={resending}
                className="rounded-xl border border-cream-300 px-4 py-2 text-sm text-ink-light hover:bg-cream-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void resendConfirmEmail()}
                disabled={resending}
                className={cn(
                  "btn-primary text-sm px-5 py-2 rounded-xl font-semibold inline-flex items-center gap-1.5",
                  resending && "opacity-60"
                )}
              >
                <Mail size={13} />
                {resending ? "Sending…" : "Send email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
