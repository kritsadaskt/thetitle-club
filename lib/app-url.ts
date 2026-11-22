/** Next.js `basePath` — keep in sync with `next.config.ts`. */
export const APP_BASE_PATH = "/club";

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

export function isVercelPreviewHost(host: string): boolean {
  return host.endsWith(".vercel.app");
}

/** True when the browser is on a Vercel Preview deployment host. */
export function isBrowserVercelPreview(): boolean {
  return typeof window !== "undefined" && isVercelPreviewHost(window.location.hostname);
}

function requestHost(request: Request): { host: string | null; proto: string } {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    (url.protocol === "http:" ? "http" : "https");
  return {
    host: forwardedHost || request.headers.get("host") || url.host || null,
    proto,
  };
}

/** Canonical browser-facing origin (never the Vercel deployment host in production). */
export function getPublicSiteOrigin(): string | null {
  if (!PUBLIC_SITE_URL) return null;
  try {
    return new URL(PUBLIC_SITE_URL).origin;
  } catch {
    return null;
  }
}

/**
 * Client-only absolute URL inside the app (includes `/club`).
 * On Vercel preview hosts, uses the current deployment origin so QR / test links
 * hit this preview instead of production `NEXT_PUBLIC_SITE_URL`.
 */
export function absoluteAppUrl(pathAndQuery: string): string {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  const browserOrigin = window.location.origin;
  if (isVercelPreviewHost(window.location.hostname)) {
    return `${browserOrigin}${APP_BASE_PATH}${path}`;
  }
  // Production / local: prefer configured public site so auth emails stay on the live domain
  const origin = getPublicSiteOrigin() ?? browserOrigin;
  return `${origin}${APP_BASE_PATH}${path}`;
}

export function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  const { host, proto } = requestHost(request);

  // Preview deployments: keep links on this deployment (QR, emails) so they match the env under test
  if (host && isVercelPreviewHost(host)) {
    return `${proto}://${host}`;
  }

  const configured = getPublicSiteOrigin();
  if (configured) return configured;

  if (process.env.NODE_ENV === "development") return url.origin;

  if (host) return `${proto}://${host}`;

  return url.origin;
}

/** Absolute URL for a Next.js path such as `/reset-password`. */
export function absoluteAppUrlFromRequest(request: Request, pathAndQuery: string): string {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  return `${getRequestOrigin(request)}${APP_BASE_PATH}${path}`;
}

/** Prevent open redirects: only same-app relative paths. */
export function safeInternalPath(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    return fallback;
  }
  return next;
}
