import type {
  ClubEvent,
  EventRegistration,
  EventSurveyQuestion,
  EventSurveyResponse,
  EventVenue,
  EventVenueSurvey,
} from "@/lib/types";

const TTL_MS = 5 * 60 * 1000;

type EventVenueCache = {
  event: ClubEvent;
  venue: EventVenue;
  fetchedAt: number;
};

type SurveyCache = {
  survey: EventVenueSurvey | null;
  questions: EventSurveyQuestion[];
  existing: EventSurveyResponse | null;
  submitted: boolean;
  fetchedAt: number;
};

const eventVenueByKey = new Map<string, EventVenueCache>();
const registrationByKey = new Map<string, { row: EventRegistration | null; fetchedAt: number }>();
const surveyByKey = new Map<string, SurveyCache>();

function fresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < TTL_MS;
}

function eventKey(eventSlug: string, venueSlug: string, locale: string): string {
  return `${locale}:${eventSlug}:${venueSlug}`;
}

function registrationKey(eventId: string, memberId: string): string {
  return `${memberId}:${eventId}`;
}

function surveyKey(
  venueId: string,
  locale: string,
  memberId: string,
  mode: "preview" | "member"
): string {
  return `${mode}:${memberId}:${locale}:${venueId}`;
}

export function getCachedEventVenue(
  eventSlug: string,
  venueSlug: string,
  locale: string
): { event: ClubEvent; venue: EventVenue } | null {
  const hit = eventVenueByKey.get(eventKey(eventSlug, venueSlug, locale));
  if (!hit || !fresh(hit.fetchedAt)) return null;
  return { event: hit.event, venue: hit.venue };
}

export function setCachedEventVenue(
  eventSlug: string,
  venueSlug: string,
  locale: string,
  event: ClubEvent,
  venue: EventVenue
): void {
  eventVenueByKey.set(eventKey(eventSlug, venueSlug, locale), {
    event,
    venue,
    fetchedAt: Date.now(),
  });
}

export function getCachedRegistration(
  eventId: string,
  memberId: string
): EventRegistration | null | undefined {
  const hit = registrationByKey.get(registrationKey(eventId, memberId));
  if (!hit || !fresh(hit.fetchedAt)) return undefined;
  return hit.row;
}

export function setCachedRegistration(
  eventId: string,
  memberId: string,
  row: EventRegistration | null
): void {
  registrationByKey.set(registrationKey(eventId, memberId), {
    row,
    fetchedAt: Date.now(),
  });
}

export function getCachedSurveyBundle(
  venueId: string,
  locale: string,
  memberId: string,
  mode: "preview" | "member"
): SurveyCache | null {
  const hit = surveyByKey.get(surveyKey(venueId, locale, memberId, mode));
  if (!hit || !fresh(hit.fetchedAt)) return null;
  return hit;
}

export function setCachedSurveyBundle(
  venueId: string,
  locale: string,
  memberId: string,
  mode: "preview" | "member",
  bundle: Omit<SurveyCache, "fetchedAt">
): void {
  surveyByKey.set(surveyKey(venueId, locale, memberId, mode), {
    ...bundle,
    fetchedAt: Date.now(),
  });
}

/** Drop survey answers cache after a successful submit (or admin question edits). */
export function invalidateSurveyCacheForVenue(venueId: string): void {
  for (const key of surveyByKey.keys()) {
    if (key.endsWith(`:${venueId}`)) surveyByKey.delete(key);
  }
}
