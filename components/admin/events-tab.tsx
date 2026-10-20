"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronRight, Plus } from "lucide-react";
import { formatEventSchedule } from "@/lib/events";
import { createEventWithCover, fetchAllEvents } from "@/lib/supabase/data";
import type { ClubEvent, CreateEventInput } from "@/lib/types";
import { cn, sortAdminByActiveThenCreated } from "@/lib/utils";
import { EventDetail } from "./event-detail";
import { EventForm } from "./event-form";

export function EventsTab() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setEvents(await fetchAllEvents());
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const selected = events.find((event) => event.id === selectedId) ?? null;

  const handleCreate = async (input: CreateEventInput, coverFile?: File | null) => {
    const res = await createEventWithCover(input, coverFile);
    if (!res.ok) return { ok: false, error: res.error };
    setEvents((prev) => sortAdminByActiveThenCreated([...prev, res.data]));
    return { ok: true };
  };

  if (selected) {
    return (
      <EventDetail
        event={selected}
        onBack={() => setSelectedId(null)}
        onEventUpdated={(updated) => {
          setEvents((prev) =>
            sortAdminByActiveThenCreated(prev.map((event) => (event.id === updated.id ? updated : event)))
          );
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-ink-muted text-xs tracking-[2px] uppercase font-semibold">All Events</h2>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
        >
          <Plus size={14} /> Add Event
        </button>
      </div>
      <p className="text-ink-muted text-xs mb-4 max-w-2xl">
        Create an event and share its link or QR. Archive hides it from the dashboard only — the link still works until you need to stop using it.
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white border border-cream-300 rounded-2xl p-10 text-center shadow-card">
          <CalendarDays size={32} className="text-ink-muted mx-auto mb-3" strokeWidth={1} />
          <p className="text-forest font-medium">No events yet</p>
          <p className="text-ink-muted text-sm mt-2">Create your first event so members can register.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => setSelectedId(event.id)}
              className="text-left bg-white border border-cream-300 rounded-2xl p-4 shadow-card hover:border-primary/40 transition-colors flex gap-4 min-w-0"
            >
              {event.coverImage ? (
                <img src={event.coverImage} alt="" className="w-20 h-16 object-cover rounded-xl shrink-0" />
              ) : (
                <div className="w-20 h-16 rounded-xl bg-cream-200 flex items-center justify-center shrink-0">
                  <CalendarDays size={18} className="text-ink-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-forest font-medium text-sm truncate">{event.title}</p>
                  <ChevronRight size={14} className="text-ink-muted shrink-0 mt-0.5" />
                </div>
                <p className="text-ink-muted text-xs mt-1">{formatEventSchedule(event.startsAt, event.endsAt)}</p>
                <span
                  className={cn(
                    "mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full border font-medium",
                    event.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                  )}
                >
                  {event.isActive ? "Active" : "Archived"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <EventForm
        open={showAdd}
        title="New event"
        submitLabel="Create event"
        onClose={() => setShowAdd(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
