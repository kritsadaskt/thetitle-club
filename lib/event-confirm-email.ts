import type { EventRegistrationConfirmedPayload, WebhookSendOptions } from "@/lib/n8n";
import { sendEventRegistrationConfirmWebhook } from "@/lib/n8n";
import type { EventRow, EventVenueRow, ProfileRow } from "@/lib/supabase/mappers";

export function buildEventRegistrationConfirmPayload(input: {
  member: ProfileRow;
  email: string;
  clubEvent: EventRow;
  venue: EventVenueRow;
  registeredAt: string;
  eventUrl: string;
}): EventRegistrationConfirmedPayload {
  const { member, email, clubEvent, venue, registeredAt, eventUrl } = input;
  return {
    event: "event_registration_confirmed",
    eventName: clubEvent.title,
    venueName: venue.name,
    member: {
      id: member.id,
      email,
      fullName: member.full_name,
      memberId: member.member_id,
      phone: member.phone ?? "",
    },
    clubEvent: {
      id: clubEvent.id,
      slug: clubEvent.slug,
      title: clubEvent.title,
      description: clubEvent.description ?? "",
    },
    venue: {
      id: venue.id,
      slug: venue.slug,
      name: venue.name,
      description: venue.description ?? "",
      location: venue.location ?? "",
      bannerImage: venue.banner_image ?? "",
      startsAt: venue.starts_at,
      endsAt: venue.ends_at,
    },
    registeredAt,
    eventUrl,
  };
}

export async function sendConfirmEmailForRegistrant(
  input: {
    member: ProfileRow;
    email: string;
    clubEvent: EventRow;
    venue: EventVenueRow;
    registeredAt: string;
    eventUrl: string;
  },
  options: WebhookSendOptions = {}
) {
  return sendEventRegistrationConfirmWebhook(buildEventRegistrationConfirmPayload(input), options);
}
