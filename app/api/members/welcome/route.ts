import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMemberApprovedWebhook } from "@/lib/n8n";
import type { ProfileRow } from "@/lib/supabase/mappers";

/** Sends the welcome (member_approved) email for the currently signed-in member. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const member = row as ProfileRow;
  if (member.status !== "active") {
    return NextResponse.json(
      { error: "Member is not active yet" },
      { status: 400 }
    );
  }

  const email = member.email?.trim() || user.email?.trim();
  if (!email) {
    return NextResponse.json(
      { error: "Member has no email on profile" },
      { status: 400 }
    );
  }

  const approvedAt = member.approved_at ?? new Date().toISOString();
  const loginUrl = new URL("/club/login", request.url).toString();

  const webhookResult = await sendMemberApprovedWebhook({
    event: "member_approved",
    member: {
      id: member.id,
      email,
      fullName: member.full_name,
      memberId: member.member_id,
      projectName: member.project_name ?? "",
      residentStatus: member.resident_status ?? "",
      approvedAt,
    },
    loginUrl,
  });

  if (!webhookResult.ok) {
    console.error("[member-welcome] n8n webhook failed:", webhookResult.error);
    return NextResponse.json(
      { success: false, emailSent: false, emailError: webhookResult.error },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, emailSent: true });
}
