"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localeToBcp47 } from "@/lib/i18n";
import type { AppLocale } from "@/i18n/routing";
import { CalendarDays, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { formatEventSchedule, isRegistrationOpen, venuePublicPath } from "@/lib/events";
import { clientWantsTestWebhook, withDevWebhookQuery } from "@/lib/n8n";
import {
  cancelEventRegistration,
  fetchEventVenue,
  fetchMyEventRegistration,
  registerForEvent,
} from "@/lib/supabase/data";
import type { ClubEvent, EventRegistration, EventVenue } from "@/lib/types";

export default function EventVenuePage() {
  const t = useTranslations("events");
  const tNav = useTranslations("nav");
  const locale = useLocale() as AppLocale;
  const bcp47 = localeToBcp47[locale] ?? "en-US";
  const params = useParams<{ slug: string; venueSlug: string }>();
  const eventSlug = decodeURIComponent(params.slug);
  const venueSlug = decodeURIComponent(params.venueSlug);
  const { member, isAdmin, isLoading } = useAuth();
  const [event, setEvent] = useState<ClubEvent | null | undefined>(undefined);
  const [venue, setVenue] = useState<EventVenue | null>(null);
  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchEventVenue(eventSlug, venueSlug, locale);
      if (cancelled) return;
      if (!result) {
        setEvent(null);
        setVenue(null);
        return;
      }
      setEvent(result.event);
      setVenue(result.venue);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventSlug, venueSlug, locale]);

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

  const registeredHere = Boolean(
    registration && !registration.cancelledAt && registration.venueId === venue?.id
  );
  const registeredElsewhere = Boolean(
    registration && !registration.cancelledAt && venue && registration.venueId !== venue.id
  );
  const otherVenueName =
    registeredElsewhere && event
      ? event.venues.find((v) => v.id === registration?.venueId)?.name
      : undefined;
  const membershipActive = member?.status === "active";
  const open = venue ? isRegistrationOpen(venue.startsAt) : false;
  const useTestWebhook = clientWantsTestWebhook();
  const venuePath = withDevWebhookQuery(venuePublicPath(eventSlug, venueSlug), useTestWebhook);
  const loginHref = `/login?next=${encodeURIComponent(venuePath)}`;

  const register = async () => {
    if (!event || !venue) return;
    setSaving(true);
    setError(null);
    const res = await registerForEvent(event.id, venue.id);
    if (!res.ok) {
      setSaving(false);
      setError(res.error);
      return;
    }
    setRegistration(res.data);
    try {
      const confirmPath = withDevWebhookQuery(
        `/club/api/events/${event.id}/confirm-email`,
        useTestWebhook
      );
      await fetch(confirmPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
    } catch {
      // Registration succeeded; confirmation email is best-effort
    }
    setSaving(false);
  };

  const cancel = async () => {
    if (!event) return;
    if (!window.confirm(t("venue.cancelConfirm"))) return;
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
            <img
              src={process.env.NEXT_PUBLIC_LOGO_IMAGE_URL_WHITE}
              alt={tNav("logoAlt")}
              className="w-24 h-auto object-contain"
            />
          </Link>
          {member ? (
            isAdmin ? (
              // /admin lives outside [locale] — use next/link
              <NextLink href="/admin" className="text-white/80 hover:text-white text-sm">
                {t("admin")}
              </NextLink>
            ) : (
              <Link href="/dashboard" className="text-white/80 hover:text-white text-sm">
                {t("dashboard")}
              </Link>
            )
          ) : (
            <Link href={loginHref} className="text-white/80 hover:text-white text-sm">
              {t("signIn")}
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6">
        {event === undefined || isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : !event || !venue ? (
          <div className="bg-white border border-cream-300 rounded-2xl p-10 text-center shadow-card">
            <CalendarDays size={32} className="text-ink-muted mx-auto mb-3" strokeWidth={1} />
            <h1 className="text-forest font-semibold text-xl">{t("venue.notFoundTitle")}</h1>
            <p className="text-ink-muted text-sm mt-2">{t("venue.notFoundMessage")}</p>
            <Link
              href={member && !isAdmin ? "/dashboard" : "/"}
              className="inline-block mt-6 text-primary-dark text-sm font-medium"
            >
              {member && !isAdmin ? t("backToDashboard") : t("backToClub")}
            </Link>
          </div>
        ) : (
          <article className="bg-white border border-cream-300 rounded-2xl overflow-hidden shadow-card">
            {venue.bannerImage ? (
              <img src={venue.bannerImage} alt="" className="w-full h-56 object-cover" />
            ) : (
              <div
                className="h-36 bg-forest-900 flex items-center justify-center"
                style={{ backgroundImage: "url('/club/club-bg.webp')" }}
              >
                <CalendarDays size={28} className="text-primary" />
              </div>
            )}
            <div className="p-6 sm:p-8">
              <p className="text-primary-dark text-xs font-semibold tracking-[2px] uppercase">
                {event.title}
              </p>
              <h1 className="text-forest text-2xl font-semibold mt-2 break-words">{venue.name}</h1>
              <p className="text-ink-light text-sm mt-3 flex items-start gap-2">
                <CalendarDays size={15} className="mt-0.5 shrink-0" />
                {formatEventSchedule(venue.startsAt, venue.endsAt, bcp47)}
              </p>
              {venue.location && (
                <p className="text-ink-light text-sm mt-2 flex items-start gap-2">
                  <MapPin size={15} className="mt-0.5 shrink-0" />
                  {venue.location}
                </p>
              )}
              {(venue.description || event.description) && (
                <p className="text-ink-light text-sm mt-5 whitespace-pre-wrap leading-relaxed">
                  {venue.description || event.description}
                </p>
              )}
              {event.venues.length > 1 && (
                <Link
                  href={withDevWebhookQuery(`/events/${event.slug}`, useTestWebhook)}
                  className="inline-block mt-4 text-primary-dark text-sm font-medium"
                >
                  {t("venue.viewAllLocations")}
                </Link>
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
                      <Link
                        href={loginHref}
                        className="btn-primary inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold"
                      >
                        {t("venue.signInToRegister")}
                      </Link>
                    ) : (
                      <p className="text-ink-muted text-sm">{t("venue.registrationClosed")}</p>
                    )}
                    {!open && (
                      <Link href={loginHref} className="block text-primary-dark text-sm font-medium">
                        {t("venue.signInToSeeRegistration")}
                      </Link>
                    )}
                  </div>
                )}

                {member && !membershipActive && (
                  <p className="text-ink-muted text-sm">
                    {t("venue.membershipMustBeActive")}
                  </p>
                )}

                {member && membershipActive && registeredHere && (
                  <div className="space-y-3">
                    <p className="text-emerald-700 text-sm font-medium">{t("venue.registeredHere")}</p>
                    {open && (
                      <button
                        type="button"
                        onClick={() => void cancel()}
                        disabled={saving}
                        className="rounded-xl border border-cream-300 px-4 py-2 text-sm text-ink-light hover:bg-cream-50 disabled:opacity-60"
                      >
                        {saving ? t("venue.cancelling") : t("venue.cancelRegistration")}
                      </button>
                    )}
                  </div>
                )}

                {member && membershipActive && registeredElsewhere && (
                  <div className="space-y-2">
                    <p className="text-ink-muted text-sm">
                      {otherVenueName
                        ? t("venue.alreadyRegisteredAt", { venue: otherVenueName })
                        : t("venue.alreadyRegisteredElsewhere")}
                    </p>
                    {event.venues.find((v) => v.id === registration?.venueId) && (
                      <Link
                        href={withDevWebhookQuery(
                          venuePublicPath(
                            event.slug,
                            event.venues.find((v) => v.id === registration?.venueId)!.slug
                          ),
                          useTestWebhook
                        )}
                        className="text-primary-dark text-sm font-medium"
                      >
                        {t("venue.goToYourLocation")}
                      </Link>
                    )}
                  </div>
                )}

                {member && membershipActive && !registeredHere && !registeredElsewhere && open && (
                  <button
                    type="button"
                    onClick={() => void register()}
                    disabled={saving}
                    className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
                  >
                    {saving ? t("venue.registering") : t("venue.register")}
                  </button>
                )}

                {member && membershipActive && !registeredHere && !registeredElsewhere && !open && (
                  <p className="text-ink-muted text-sm">
                    {t("venue.closedNotRegistered")}
                  </p>
                )}
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
