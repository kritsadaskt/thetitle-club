import { NextResponse, type NextRequest } from "next/server";
import { absoluteAppUrlFromRequest } from "@/lib/app-url";
import { sendConfirmEmailForRegistrant } from "@/lib/event-confirm-email";
import { createClient } from "@/lib/supabase/server";
import type { EventRow, ProfileRow } from "@/lib/supabase/mappers";

type RouteContext = {
  params: Promise<{ eventId: string }>;
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
        .select("id, registered_at, cancelled_at")
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

  const member = profileRow as ProfileRow;
  const clubEvent = eventRow as EventRow;
  const email = member.email?.trim() || user.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Member has no email on profile" }, { status: 400 });
  }

  const webhookResult = await sendConfirmEmailForRegistrant({
    member,
    email,
    clubEvent,
    registeredAt: registration.registered_at as string,
    eventUrl: absoluteAppUrlFromRequest(request, `/events/${clubEvent.slug}`),
  });

  if (!webhookResult.ok) {
    console.error("[event-confirm-email] n8n webhook failed:", webhookResult.error);
    return NextResponse.json(
      { success: false, emailSent: false, emailError: webhookResult.error },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, emailSent: true });
}
