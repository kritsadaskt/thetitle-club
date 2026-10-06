"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowLeft, Copy, Download, Pencil } from "lucide-react";
import { absoluteAppUrl } from "@/lib/app-url";
import { formatEventDateTime, formatEventSchedule } from "@/lib/events";
import { fetchEventRegistrants, updateEventWithCover } from "@/lib/supabase/data";
import type { ClubEvent, CreateEventInput, EventRegistrant } from "@/lib/types";
import { ActiveToggle } from "./active-toggle";
import { EventForm } from "./event-form";

type Props = {
  event: ClubEvent;
  onBack: () => void;
  onEventUpdated: (event: ClubEvent) => void;
};

export function EventDetail({ event, onBack, onEventUpdated }: Props) {
  const [registrants, setRegistrants] = useState<EventRegistrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shareUrl = absoluteAppUrl(`/events/${event.slug}`);

  const loadRegistrants = useCallback(async () => {
    setLoading(true);
    const result = await fetchEventRegistrants(event.id);
    setRegistrants(result.rows);
    setError(result.error ?? null);
    setLoading(false);
  }, [event.id]);

  useEffect(() => {
    void loadRegistrants();
  }, [loadRegistrants]);

  const handleArchive = async (isActive: boolean) => {
    setError(null);
    setArchiving(true);
    const res = await updateEventWithCover(event.id, { isActive });
    setArchiving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onEventUpdated(res.data);
  };

  const handleUpdate = async (input: CreateEventInput, coverFile?: File | null) => {
    const res = await updateEventWithCover(event.id, input, coverFile);
    if (!res.ok) return { ok: false, error: res.error };
    onEventUpdated(res.data);
    return { ok: true };
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const exportRegistrants = async () => {
    const XLSX = await import("xlsx");
    const rows = [
      ["Member ID", "Name", "Email", "Phone", "Registered at"],
      ...registrants.map((row) => [
        row.memberCode,
        row.fullName,
        row.email,
        row.phone,
        formatEventDateTime(row.registeredAt),
      ]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Registrations");
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

      <div className="bg-white border border-cream-300 rounded-2xl p-5 mb-6 shadow-card">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-forest font-semibold text-xl break-words">{event.title}</h2>
                <p className="text-ink-muted text-sm mt-1">{formatEventSchedule(event.startsAt, event.endsAt)}</p>
                {event.location && <p className="text-ink-light text-sm mt-1">{event.location}</p>}
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
                <p className="text-ink-muted text-xs mt-2">Archived events stay hidden from members and the public link.</p>
              )}
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-cream-300 bg-cream-50 p-4 w-full lg:w-56">
            <div className="bg-white rounded-xl p-3 w-fit mx-auto">
              <QRCodeCanvas value={shareUrl} size={160} includeMargin />
            </div>
            <p className="text-[11px] text-ink-muted mt-3 break-all text-center">{shareUrl}</p>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-cream-300 bg-white px-3 py-2 text-xs text-forest hover:bg-cream-100"
            >
              <Copy size={12} /> {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-ink-muted text-xs tracking-[2px] uppercase font-semibold">
          Registrations ({registrants.length})
        </h3>
        <button
          type="button"
          onClick={() => void exportRegistrants()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cream-300 bg-white px-3 py-2 text-xs text-forest hover:bg-cream-100"
        >
          <Download size={12} /> Export Excel
        </button>
      </div>

      <div className="bg-white border border-cream-300 rounded-2xl overflow-hidden shadow-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : registrants.length === 0 ? (
          <p className="text-ink-muted text-sm text-center py-12">No one has registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-300 bg-cream-100">
                  {["Member ID", "Name", "Email", "Phone", "Registered"].map((heading) => (
                    <th key={heading} className="px-5 py-3.5 text-left text-ink-muted text-xs font-semibold tracking-wide">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {registrants.map((row) => (
                  <tr key={row.id} className="hover:bg-cream-100/60">
                    <td className="px-5 py-3.5 font-mono text-xs text-ink-light">{row.memberCode || "—"}</td>
                    <td className="px-5 py-3.5 text-forest font-medium">{row.fullName || "—"}</td>
                    <td className="px-5 py-3.5 text-ink-muted text-xs">{row.email || "—"}</td>
                    <td className="px-5 py-3.5 text-ink-muted text-xs">{row.phone || "—"}</td>
                    <td className="px-5 py-3.5 text-ink-muted text-xs whitespace-nowrap">
                      {formatEventDateTime(row.registeredAt)}
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
    </div>
  );
}
