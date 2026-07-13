import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMemberApprovedWebhook } from "@/lib/n8n";
import type { ProfileRow } from "@/lib/supabase/mappers";

type RouteContext = {
  params: Promise<{ memberId: string }>;
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

  return { supabase, adminUserId: user.id };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { supabase, adminUserId } = auth;
  const { memberId } = await context.params;

  const { data: memberRow, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", memberId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!memberRow) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const member = memberRow as ProfileRow;
  if (member.is_admin) {
    return NextResponse.json({ error: "Cannot approve admin accounts" }, { status: 400 });
  }
  if (member.status === "active") {
    return NextResponse.json({ error: "Member is already active" }, { status: 400 });
  }

  const approvedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      status: "active",
      approved_at: approvedAt,
      approved_by: adminUserId,
    })
    .eq("id", memberId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const loginUrl = new URL("/club/login", request.url).toString();
  const email = member.email?.trim();
  let emailSent = false;
  let emailError: string | undefined;

  if (!email) {
    emailError = "Member has no email on profile";
  } else {
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

    if (webhookResult.ok) {
      emailSent = true;
    } else {
      emailError = webhookResult.error;
      console.error("[member-approved] n8n webhook failed:", webhookResult.error);
    }
  }

  return NextResponse.json({
    success: true,
    emailSent,
    ...(emailError ? { emailError } : {}),
  });
}
