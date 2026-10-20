"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowLeft, Copy, Download, Mail, Pencil } from "lucide-react";
import { absoluteAppUrl } from "@/lib/app-url";
import { formatEventDateTime, formatEventSchedule } from "@/lib/events";
import { fetchEventRegistrationLogs, fetchEventRegistrants, updateEventWithCover } from "@/lib/supabase/data";
import type { ClubEvent, CreateEventInput, EventRegistrant, EventRegistrationLog } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActiveToggle } from "./active-toggle";
import { EventForm } from "./event-form";

type Props = {
  event: ClubEvent;
  onBack: () => void;
  onEventUpdated: (event: ClubEvent) => void;
};

export function EventDetail({ event, onBack, onEventUpdated }: Props) {
  const [registrants, setRegistrants] = useState<EventRegistrant[]>([]);
  const [logs, setLogs] = useState<EventRegistrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [resendTarget, setResendTarget] = useState<EventRegistrant | null>(null);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shareUrl = absoluteAppUrl(`/events/${event.slug}`);

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
    const historyRows = [
      ["Time", "Member ID", "Name", "Action"],
      ...logs.map((row) => [
        formatEventDateTime(row.occurredAt),
        row.memberCode,
        row.fullName,
        row.action === "registered" ? "Registered" : "Cancelled",
      ]),
    ];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), "Registrations");
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
                <p className="text-ink-muted text-xs mt-2">
                  Archived events are hidden from the member dashboard, but the link and QR still work for registration.
                </p>
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

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
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
                  {["Member ID", "Name", "Email", "Phone", "Registered", ""].map((heading) => (
                    <th key={heading || "actions"} className="px-5 py-3.5 text-left text-ink-muted text-xs font-semibold tracking-wide">
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
        Registration history ({logs.length})
      </h3>
      <div className="bg-white border border-cream-300 rounded-2xl overflow-hidden shadow-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-ink-muted text-sm text-center py-12">No registration activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-300 bg-cream-100">
                  {["Time", "Member ID", "Name", "Action"].map((heading) => (
                    <th key={heading} className="px-5 py-3.5 text-left text-ink-muted text-xs font-semibold tracking-wide">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {logs.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3.5 text-ink-muted text-xs whitespace-nowrap">
                      {formatEventDateTime(row.occurredAt)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-ink-light">{row.memberCode || "—"}</td>
                    <td className="px-5 py-3.5 text-forest font-medium">{row.fullName || "—"}</td>
                    <td className="px-5 py-3.5 text-xs">
                      <span
                        className={
                          row.action === "registered"
                            ? "text-emerald-700"
                            : "text-ink-muted"
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
                <span className="font-semibold text-forest">{event.title}</span> again to{" "}
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
              <p className="text-ink-muted text-xs">
                Only this member will receive the email.
              </p>
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
