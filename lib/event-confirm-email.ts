import type { EventRegistrationConfirmedPayload, WebhookSendOptions } from "@/lib/n8n";
import { sendEventRegistrationConfirmWebhook } from "@/lib/n8n";
import type { EventRow, ProfileRow } from "@/lib/supabase/mappers";

export function buildEventRegistrationConfirmPayload(input: {
  member: ProfileRow;
  email: string;
  clubEvent: EventRow;
  registeredAt: string;
  eventUrl: string;
}): EventRegistrationConfirmedPayload {
  const { member, email, clubEvent, registeredAt, eventUrl } = input;
  return {
    event: "event_registration_confirmed",
    eventName: clubEvent.title,
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
      location: clubEvent.location ?? "",
      coverImage: clubEvent.cover_image ?? "",
      startsAt: clubEvent.starts_at,
      endsAt: clubEvent.ends_at,
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
    registeredAt: string;
    eventUrl: string;
  },
  options: WebhookSendOptions = {}
) {
  return sendEventRegistrationConfirmWebhook(buildEventRegistrationConfirmPayload(input), options);
}
