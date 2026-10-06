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

export function isRegistrationOpen(startsAt: string, now = Date.now()): boolean {
  return new Date(startsAt).getTime() > now;
}

/** Active events that have not ended. Without an end time, hide them once they start. */
export function isUpcomingOrOngoing(
  event: { startsAt: string; endsAt?: string },
  now = Date.now()
): boolean {
  const end = event.endsAt ? new Date(event.endsAt).getTime() : new Date(event.startsAt).getTime();
  return end >= now;
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
