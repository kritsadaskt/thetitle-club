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

export type EventRegistrationConfirmedPayload = {
  event: "event_registration_confirmed";
  /** Club event display name — convenient top-level field for n8n templates */
  eventName: string;
  /** Venue display name — convenient top-level field for n8n templates */
  venueName: string;
  member: {
    id: string;
    email: string;
    fullName: string;
    memberId: string;
    phone: string;
  };
  clubEvent: {
    id: string;
    slug: string;
    title: string;
    description: string;
  };
  venue: {
    id: string;
    slug: string;
    name: string;
    description: string;
    location: string;
    bannerImage: string;
    startsAt: string;
    endsAt: string | null;
  };
  registeredAt: string;
  /** Absolute URL of the venue registration page */
  eventUrl: string;
};

export type WebhookSendOptions = {
  /** When true, post to n8n test webhook instead of production. */
  useTestWebhook?: boolean;
};

type SendResult =
  | { ok: true; webhookUrl: string; usedTestWebhook: boolean }
  | { ok: false; error: string };

type PostResult = { ok: true } | { ok: false; error: string };

/** True when the current browser URL has `dev=1`. */
export function clientWantsTestWebhook(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("dev") === "1";
}

/** True when the API request URL has `dev=1`. */
export function requestWantsTestWebhook(request: Request): boolean {
  return new URL(request.url).searchParams.get("dev") === "1";
}

/** Append or strip `dev=1` on an app-relative path. */
export function withDevWebhookQuery(pathAndQuery: string, useTestWebhook: boolean): string {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  const url = new URL(path, "http://local.invalid");
  if (useTestWebhook) url.searchParams.set("dev", "1");
  else url.searchParams.delete("dev");
  const search = url.searchParams.toString();
  return `${url.pathname}${search ? `?${search}` : ""}`;
}

/**
 * Prefer an explicit TEST env URL when set.
 * Otherwise swap n8n `/webhook/` → `/webhook-test/` (n8n listen/test mode).
 */
function resolveWebhookUrl(
  productionUrl: string,
  testEnvUrl: string | undefined,
  useTestWebhook: boolean
): { url: string; usedTestWebhook: boolean } {
  if (!useTestWebhook) {
    return { url: productionUrl, usedTestWebhook: false };
  }

  const configuredTest = testEnvUrl?.trim();
  if (configuredTest) {
    return { url: configuredTest, usedTestWebhook: true };
  }

  if (productionUrl.includes("/webhook-test/")) {
    return { url: productionUrl, usedTestWebhook: true };
  }

  if (productionUrl.includes("/webhook/")) {
    return {
      url: productionUrl.replace("/webhook/", "/webhook-test/"),
      usedTestWebhook: true,
    };
  }

  return { url: productionUrl, usedTestWebhook: false };
}

async function postWebhook(webhookUrl: string, payload: unknown): Promise<PostResult> {
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

export async function sendMemberApprovedWebhook(
  payload: MemberApprovedPayload,
  options: WebhookSendOptions = {}
): Promise<SendResult> {
  const productionUrl = process.env.N8N_MEMBER_APPROVED_WEBHOOK_URL?.trim();
  if (!productionUrl) {
    return { ok: false, error: "N8N_MEMBER_APPROVED_WEBHOOK_URL is not configured" };
  }

  const { url, usedTestWebhook } = resolveWebhookUrl(
    productionUrl,
    process.env.N8N_MEMBER_APPROVED_TEST_WEBHOOK_URL,
    Boolean(options.useTestWebhook)
  );

  const result = await postWebhook(url, payload);
  if (!result.ok) return result;
  return { ok: true, webhookUrl: url, usedTestWebhook };
}

export async function sendEventRegistrationConfirmWebhook(
  payload: EventRegistrationConfirmedPayload,
  options: WebhookSendOptions = {}
): Promise<SendResult> {
  const productionUrl = process.env.N8N_EVENT_CONFIRM_EMAIL_WEBHOOK_URL?.trim();
  if (!productionUrl) {
    return { ok: false, error: "N8N_EVENT_CONFIRM_EMAIL_WEBHOOK_URL is not configured" };
  }

  const { url, usedTestWebhook } = resolveWebhookUrl(
    productionUrl,
    process.env.N8N_EVENT_CONFIRM_EMAIL_TEST_WEBHOOK_URL,
    Boolean(options.useTestWebhook)
  );

  const result = await postWebhook(url, payload);
  if (!result.ok) return result;
  return { ok: true, webhookUrl: url, usedTestWebhook };
}
