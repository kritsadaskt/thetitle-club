import { NextResponse, type NextRequest } from "next/server";
import { absoluteAppUrlFromRequest } from "@/lib/app-url";
import { venuePublicPath } from "@/lib/events";
import { sendConfirmEmailForRegistrant } from "@/lib/event-confirm-email";
import { createClient } from "@/lib/supabase/server";
import type { EventRow, EventVenueRow, ProfileRow } from "@/lib/supabase/mappers";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

type RegistrantJoin = {
  registered_at: string;
  venue_id: string;
  profiles: ProfileRow | ProfileRow[] | null;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: adminProfile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !adminProfile?.is_admin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase };
}

/** Admin: resend confirmation email to one currently registered member. */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { supabase } = auth;
  const { eventId } = await context.params;

  let memberId = "";
  try {
    const body = (await request.json()) as { memberId?: string };
    memberId = body.memberId?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }
  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  const { data: eventRow, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }
  if (!eventRow) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const clubEvent = eventRow as EventRow;

  const { data: row, error: listError } = await supabase
    .from("event_registrations")
    .select("registered_at, venue_id, profiles!event_registrations_member_id_fkey(*)")
    .eq("event_id", eventId)
    .eq("member_id", memberId)
    .is("cancelled_at", null)
    .maybeSingle();

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Active registration not found for this member" }, { status: 404 });
  }

  const registrant = row as unknown as RegistrantJoin;
  const profile = Array.isArray(registrant.profiles) ? registrant.profiles[0] : registrant.profiles;
  if (!profile) {
    return NextResponse.json({ error: "Member profile not found" }, { status: 404 });
  }

  const { data: venueRow, error: venueError } = await supabase
    .from("event_venues")
    .select("*")
    .eq("id", registrant.venue_id)
    .maybeSingle();

  if (venueError) {
    return NextResponse.json({ error: venueError.message }, { status: 500 });
  }
  if (!venueRow) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  const venue = venueRow as EventVenueRow;
  const email = profile.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Member has no email on profile" }, { status: 400 });
  }

  const eventUrl = absoluteAppUrlFromRequest(request, venuePublicPath(clubEvent.slug, venue.slug));

  const result = await sendConfirmEmailForRegistrant({
    member: profile,
    email,
    clubEvent,
    venue,
    registeredAt: registrant.registered_at,
    eventUrl,
  });

  if (!result.ok) {
    console.error("[event-resend-confirm-email] send failed:", result.error);
    return NextResponse.json(
      { success: false, emailSent: false, emailError: result.error, error: result.error },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    emailSent: true,
    memberId: profile.member_id,
    email,
  });
}
