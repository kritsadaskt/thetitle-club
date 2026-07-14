export type MemberApprovedPayload = {
  event: "member_approved";
  member: {
    id: string;
    email: string;
    fullName: string;
    memberId: string;
    projectName: string;
    residentStatus: string;
    approvedAt: string;
  };
  loginUrl: string;
};

type SendResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendMemberApprovedWebhook(
  payload: MemberApprovedPayload
): Promise<SendResult> {
  const webhookUrl = process.env.N8N_MEMBER_APPROVED_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return { ok: false, error: "N8N_MEMBER_APPROVED_WEBHOOK_URL is not configured" };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `n8n webhook returned ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}
