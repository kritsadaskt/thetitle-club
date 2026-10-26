import type { ClubEvent, EventVenue } from "@/lib/types";

const BANGKOK = "Asia/Bangkok";

/** URL slug from a title or a typed slug. Empty when the text has no latin characters. */
export function slugifyEventTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Use the typed slug, otherwise the title, otherwise a short random slug. */
export function ensureEventSlug(title: string, slug: string): string {
  return slugifyEventTitle(slug) || slugifyEventTitle(title) || `event-${Math.random().toString(36).slice(2, 8)}`;
}

export function ensureVenueSlug(name: string, slug: string): string {
  return slugifyEventTitle(slug) || slugifyEventTitle(name) || `venue-${Math.random().toString(36).slice(2, 8)}`;
}

export function isRegistrationOpen(startsAt: string, now = Date.now()): boolean {
  return new Date(startsAt).getTime() > now;
}

/** Venue (or schedule bounds) that have not ended. Without an end time, hide once they start. */
export function isUpcomingOrOngoing(
  schedule: { startsAt: string; endsAt?: string },
  now = Date.now()
): boolean {
  const end = schedule.endsAt ? new Date(schedule.endsAt).getTime() : new Date(schedule.startsAt).getTime();
  return end >= now;
}

export function sortedEventVenues(venues: EventVenue[]): EventVenue[] {
  return [...venues].sort((a, b) => a.sortOrder - b.sortOrder || a.startsAt.localeCompare(b.startsAt));
}

/** Earliest start among venues. */
export function eventEarliestStartsAt(event: ClubEvent): string | undefined {
  const venues = sortedEventVenues(event.venues);
  if (venues.length === 0) return undefined;
  return venues.reduce((min, v) => (v.startsAt < min ? v.startsAt : min), venues[0].startsAt);
}

/** Latest end among venues; falls back to that venue's start when endsAt is missing. */
export function eventLatestEndsAt(event: ClubEvent): string | undefined {
  const venues = sortedEventVenues(event.venues);
  if (venues.length === 0) return undefined;
  return venues.reduce((max, v) => {
    const end = v.endsAt ?? v.startsAt;
    return end > max ? end : max;
  }, venues[0].endsAt ?? venues[0].startsAt);
}

export function eventPrimaryBanner(event: ClubEvent): string {
  return sortedEventVenues(event.venues).find((v) => v.bannerImage)?.bannerImage ?? "";
}

export function eventLocationSummary(event: ClubEvent): string {
  const venues = sortedEventVenues(event.venues);
  if (venues.length === 0) return "";
  if (venues.length === 1) return venues[0].location || venues[0].name;
  return `${venues.length} locations`;
}

export function isEventUpcomingOrOngoing(event: ClubEvent, now = Date.now()): boolean {
  return event.venues.some((venue) => isUpcomingOrOngoing(venue, now));
}

export function venuePublicPath(eventSlug: string, venueSlug: string): string {
  return `/events/${eventSlug}/${venueSlug}`;
}

function bangkokParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function bangkokDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function formatEventDateTime(iso: string): string {
  const { day, month, year, hour, minute } = bangkokParts(iso);
  return `${day} ${month} ${year}, ${hour}:${minute}`;
}

export function formatEventSchedule(startsAt: string, endsAt?: string): string {
  const start = formatEventDateTime(startsAt);
  if (!endsAt) return start;
  if (bangkokDateKey(startsAt) === bangkokDateKey(endsAt)) {
    const end = bangkokParts(endsAt);
    return `${start} – ${end.hour}:${end.minute}`;
  }
  return `${start} – ${formatEventDateTime(endsAt)}`;
}

/** `datetime-local` value in Asia/Bangkok. */
export function toDatetimeLocalValue(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Interpret a `datetime-local` value as Asia/Bangkok and return an ISO string. */
export function fromDatetimeLocalValue(value: string): string {
  return new Date(`${value}:00+07:00`).toISOString();
}
