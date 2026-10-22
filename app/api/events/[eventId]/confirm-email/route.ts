import { NextResponse, type NextRequest } from "next/server";
import { absoluteAppUrlFromRequest } from "@/lib/app-url";
import { venuePublicPath } from "@/lib/events";
import { sendConfirmEmailForRegistrant } from "@/lib/event-confirm-email";
import { requestWantsTestWebhook } from "@/lib/n8n";
import { createClient } from "@/lib/supabase/server";
import type { EventRow, EventVenueRow, ProfileRow } from "@/lib/supabase/mappers";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

type RegistrationRow = {
  registered_at: string;
  cancelled_at: string | null;
  venue_id: string;
};

/** Sends the event registration confirmation email for the signed-in member. */
export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await context.params;

  const [{ data: profileRow, error: profileError }, { data: eventRow, error: eventError }, { data: registration, error: registrationError }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("events").select("*").eq("id", eventId).maybeSingle(),
      supabase
        .from("event_registrations")
        .select("id, registered_at, cancelled_at, venue_id")
        .eq("event_id", eventId)
        .eq("member_id", user.id)
        .maybeSingle(),
    ]);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }
  if (registrationError) {
    return NextResponse.json({ error: registrationError.message }, { status: 500 });
  }
  if (!profileRow) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (!eventRow) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (!registration || registration.cancelled_at) {
    return NextResponse.json({ error: "You are not registered for this event" }, { status: 400 });
  }

  const reg = registration as RegistrationRow;
  const { data: venueRow, error: venueError } = await supabase
    .from("event_venues")
    .select("*")
    .eq("id", reg.venue_id)
    .maybeSingle();

  if (venueError) {
    return NextResponse.json({ error: venueError.message }, { status: 500 });
  }
  if (!venueRow) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  const member = profileRow as ProfileRow;
  const clubEvent = eventRow as EventRow;
  const venue = venueRow as EventVenueRow;
  const email = member.email?.trim() || user.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Member has no email on profile" }, { status: 400 });
  }

  const useTestWebhook = requestWantsTestWebhook(request);
  const webhookResult = await sendConfirmEmailForRegistrant(
    {
      member,
      email,
      clubEvent,
      venue,
      registeredAt: reg.registered_at,
      eventUrl: absoluteAppUrlFromRequest(request, venuePublicPath(clubEvent.slug, venue.slug)),
    },
    { useTestWebhook }
  );

  if (!webhookResult.ok) {
    console.error("[event-confirm-email] n8n webhook failed:", webhookResult.error);
    return NextResponse.json(
      { success: false, emailSent: false, emailError: webhookResult.error },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    emailSent: true,
    usedTestWebhook: webhookResult.usedTestWebhook,
  });
}
