"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  eventEarliestStartsAt,
  eventLatestEndsAt,
  eventLocationSummary,
  eventPrimaryBanner,
  formatEventSchedule,
  venuePublicPath,
} from "@/lib/events";
import { clientWantsTestWebhook, withDevWebhookQuery } from "@/lib/n8n";
import { fetchEventBySlug, fetchMyEventRegistration } from "@/lib/supabase/data";
import type { ClubEvent, EventRegistration } from "@/lib/types";

export default function EventHubPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug);
  const router = useRouter();
  const { member, isAdmin, isLoading } = useAuth();
  const [event, setEvent] = useState<ClubEvent | null | undefined>(undefined);
  const [registration, setRegistration] = useState<EventRegistration | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const row = await fetchEventBySlug(slug);
      if (cancelled) return;
      if (row && row.venues.length === 1) {
        const path = withDevWebhookQuery(
          venuePublicPath(row.slug, row.venues[0].slug),
          clientWantsTestWebhook()
        );
        router.replace(path);
        return;
      }
      setEvent(row);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, router]);

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

  const registeredVenueId =
    registration && !registration.cancelledAt ? registration.venueId : null;
  const cover = event ? eventPrimaryBanner(event) : "";
  const startsAt = event ? eventEarliestStartsAt(event) : undefined;
  const endsAt = event ? eventLatestEndsAt(event) : undefined;
  const locationSummary = event ? eventLocationSummary(event) : "";

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="bg-deep-blue px-6 py-5" style={{ backgroundImage: "url('/club/club-bg.webp')" }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <Link href="/">
            <img
              src={process.env.NEXT_PUBLIC_LOGO_IMAGE_URL_WHITE}
              alt="The Title"
              className="w-24 h-auto object-contain"
            />
          </Link>
          {member ? (
            <Link href={isAdmin ? "/admin" : "/dashboard"} className="text-white/80 hover:text-white text-sm">
              {isAdmin ? "Admin" : "Dashboard"}
            </Link>
          ) : (
            <Link href="/login" className="text-white/80 hover:text-white text-sm">
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
        ) : !event ? (
          <div className="bg-white border border-cream-300 rounded-2xl p-10 text-center shadow-card">
            <CalendarDays size={32} className="text-ink-muted mx-auto mb-3" strokeWidth={1} />
            <h1 className="text-forest font-semibold text-xl">Event not found</h1>
            <p className="text-ink-muted text-sm mt-2">The link may be incorrect or the event was removed.</p>
            <Link
              href={member && !isAdmin ? "/dashboard" : "/"}
              className="inline-block mt-6 text-primary-dark text-sm font-medium"
            >
              {member && !isAdmin ? "Back to dashboard" : "Back to club"}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <article className="bg-white border border-cream-300 rounded-2xl overflow-hidden shadow-card">
              {cover ? (
                <img src={cover} alt="" className="w-full h-48 object-cover" />
              ) : (
                <div
                  className="h-28 bg-forest-900 flex items-center justify-center"
                  style={{ backgroundImage: "url('/club/club-bg.webp')" }}
                >
                  <CalendarDays size={28} className="text-primary" />
                </div>
              )}
              <div className="p-6 sm:p-8">
                <p className="text-primary-dark text-xs font-semibold tracking-[2px] uppercase">Club event</p>
                <h1 className="text-forest text-2xl font-semibold mt-2 break-words">{event.title}</h1>
                {startsAt && (
                  <p className="text-ink-light text-sm mt-3 flex items-start gap-2">
                    <CalendarDays size={15} className="mt-0.5 shrink-0" />
                    {formatEventSchedule(startsAt, endsAt)}
                  </p>
                )}
                {locationSummary && (
                  <p className="text-ink-light text-sm mt-2 flex items-start gap-2">
                    <MapPin size={15} className="mt-0.5 shrink-0" />
                    {locationSummary}
                  </p>
                )}
                {event.description && (
                  <p className="text-ink-light text-sm mt-5 whitespace-pre-wrap leading-relaxed">
                    {event.description}
                  </p>
                )}
                {registeredVenueId && (
                  <p className="text-emerald-700 text-sm font-medium mt-5">
                    You are registered
                    {event.venues.find((v) => v.id === registeredVenueId)
                      ? ` at ${event.venues.find((v) => v.id === registeredVenueId)!.name}`
                      : ""}
                    .
                  </p>
                )}
              </div>
            </article>

            <div>
              <h2 className="text-ink-muted text-xs tracking-[2px] uppercase font-semibold mb-3">
                Choose a location
              </h2>
              <div className="space-y-3">
                {event.venues.map((venue) => {
                  const href = withDevWebhookQuery(
                    venuePublicPath(event.slug, venue.slug),
                    clientWantsTestWebhook()
                  );
                  const isMine = registeredVenueId === venue.id;
                  return (
                    <Link
                      key={venue.id}
                      href={href}
                      className="flex items-center gap-3 sm:gap-4 bg-white border border-cream-300 rounded-2xl p-3 sm:p-4 card-hover group shadow-card min-w-0"
                    >
                      {venue.bannerImage ? (
                        <img
                          src={venue.bannerImage}
                          alt=""
                          className="w-16 h-12 sm:w-20 sm:h-14 object-cover rounded-lg shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-12 sm:w-20 sm:h-14 rounded-lg bg-forest-50 text-forest-700 flex items-center justify-center shrink-0">
                          <MapPin size={18} strokeWidth={1.5} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-forest text-sm font-medium truncate">{venue.name}</p>
                          {isMine && (
                            <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              Registered
                            </span>
                          )}
                        </div>
                        <p className="text-ink-muted text-xs mt-0.5">
                          {formatEventSchedule(venue.startsAt, venue.endsAt)}
                        </p>
                        {venue.location && (
                          <p className="text-ink-muted text-xs mt-0.5 truncate">{venue.location}</p>
                        )}
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-cream-400 group-hover:text-primary-dark transition-colors shrink-0"
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
