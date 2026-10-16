"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { formatEventSchedule, isRegistrationOpen } from "@/lib/events";
import { cancelEventRegistration, fetchEventBySlug, fetchMyEventRegistration, registerForEvent } from "@/lib/supabase/data";
import type { ClubEvent, EventRegistration } from "@/lib/types";

export default function EventPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug);
  const { member, isAdmin, isLoading } = useAuth();
  const [event, setEvent] = useState<ClubEvent | null | undefined>(undefined);
  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const row = await fetchEventBySlug(slug);
      if (!cancelled) setEvent(row);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!member || !event) {
      setRegistration(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const row = await fetchMyEventRegistration(event.id);
      if (!cancelled) setRegistration(row);
    })();
    return () => {
      cancelled = true;
    };
  }, [member, event]);

  const registered = Boolean(registration && !registration.cancelledAt);
  const membershipActive = member?.status === "active";
  const open = event ? isRegistrationOpen(event.startsAt) && event.isActive : false;
  const loginHref = `/login?next=${encodeURIComponent(`/events/${slug}`)}`;

  const register = async () => {
    if (!event) return;
    setSaving(true);
    setError(null);
    const res = await registerForEvent(event.id);
    if (!res.ok) {
      setSaving(false);
      setError(res.error);
      return;
    }
    setRegistration(res.data);
    try {
      await fetch(`/club/api/events/${event.id}/confirm-email`, { method: "POST" });
    } catch {
      // Registration succeeded; confirmation email is best-effort
    }
    setSaving(false);
  };

  const cancel = async () => {
    if (!event) return;
    if (!window.confirm("Cancel your registration for this event?")) return;
    setSaving(true);
    setError(null);
    const res = await cancelEventRegistration(event.id);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setRegistration(res.data);
  };

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="bg-deep-blue px-6 py-5" style={{ backgroundImage: "url('/club/club-bg.webp')" }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <Link href="/">
            <img src={process.env.NEXT_PUBLIC_LOGO_IMAGE_URL_WHITE} alt="The Title" className="w-24 h-auto object-contain" />
          </Link>
          {member ? (
            <Link href={isAdmin ? "/admin" : "/dashboard"} className="text-white/80 hover:text-white text-sm">
              {isAdmin ? "Admin" : "Dashboard"}
            </Link>
          ) : (
            <Link href={loginHref} className="text-white/80 hover:text-white text-sm">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6">
        {event === undefined || isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : !event || !event.isActive ? (
          <div className="bg-white border border-cream-300 rounded-2xl p-10 text-center shadow-card">
            <CalendarDays size={32} className="text-ink-muted mx-auto mb-3" strokeWidth={1} />
            <h1 className="text-forest font-semibold text-xl">This event is no longer available</h1>
            <p className="text-ink-muted text-sm mt-2">It may have been archived or the link is incorrect.</p>
            <Link href={member && !isAdmin ? "/dashboard" : "/"} className="inline-block mt-6 text-primary-dark text-sm font-medium">
              {member && !isAdmin ? "Back to dashboard" : "Back to club"}
            </Link>
          </div>
        ) : (
          <article className="bg-white border border-cream-300 rounded-2xl overflow-hidden shadow-card">
            {event.coverImage ? (
              <img src={event.coverImage} alt="" className="w-full h-56 object-cover" />
            ) : (
              <div className="h-36 bg-forest-900 flex items-center justify-center" style={{ backgroundImage: "url('/club/club-bg.webp')" }}>
                <CalendarDays size={28} className="text-primary" />
              </div>
            )}
            <div className="p-6 sm:p-8">
              <p className="text-primary-dark text-xs font-semibold tracking-[2px] uppercase">Club event</p>
              <h1 className="text-forest text-2xl font-semibold mt-2 break-words">{event.title}</h1>
              <p className="text-ink-light text-sm mt-3 flex items-start gap-2">
                <CalendarDays size={15} className="mt-0.5 shrink-0" />
                {formatEventSchedule(event.startsAt, event.endsAt)}
              </p>
              {event.location && (
                <p className="text-ink-light text-sm mt-2 flex items-start gap-2">
                  <MapPin size={15} className="mt-0.5 shrink-0" />
                  {event.location}
                </p>
              )}
              {event.description && (
                <p className="text-ink-light text-sm mt-5 whitespace-pre-wrap leading-relaxed">{event.description}</p>
              )}

              <div className="mt-8 border-t border-cream-200 pt-6">
                {error && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {error}
                  </div>
                )}

                {!member && (
                  <div className="space-y-3">
                    {open ? (
                      <Link href={loginHref} className="btn-primary inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold">
                        Sign in to register
                      </Link>
                    ) : (
                      <p className="text-ink-muted text-sm">Registration is closed.</p>
                    )}
                    {!open && (
                      <Link href={loginHref} className="block text-primary-dark text-sm font-medium">
                        Sign in to see your registration
                      </Link>
                    )}
                  </div>
                )}

                {member && !membershipActive && (
                  <p className="text-ink-muted text-sm">Your membership must be active before you can register.</p>
                )}

                {member && membershipActive && registered && (
                  <div className="space-y-3">
                    <p className="text-emerald-700 text-sm font-medium">You are registered.</p>
                    {open && (
                      <button
                        type="button"
                        onClick={() => void cancel()}
                        disabled={saving}
                        className="rounded-xl border border-cream-300 px-4 py-2 text-sm text-ink-light hover:bg-cream-50 disabled:opacity-60"
                      >
                        {saving ? "Cancelling…" : "Cancel registration"}
                      </button>
                    )}
                  </div>
                )}

                {member && membershipActive && !registered && open && (
                  <button
                    type="button"
                    onClick={() => void register()}
                    disabled={saving}
                    className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
                  >
                    {saving ? "Registering…" : "Register"}
                  </button>
                )}

                {member && membershipActive && !registered && !open && (
                  <p className="text-ink-muted text-sm">Registration is closed. You are not registered for this event.</p>
                )}
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
