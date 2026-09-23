/** Next.js `basePath` — keep in sync with `next.config.ts`. */
export const APP_BASE_PATH = "/club";

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

function isVercelPreviewHost(host: string): boolean {
  return host.endsWith(".vercel.app");
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

/** Client-only absolute URL inside the app (includes `/club`). */
export function absoluteAppUrl(pathAndQuery: string): string {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  // Prefer configured public site so auth emails never bake in *.vercel.app
  const origin = getPublicSiteOrigin() ?? window.location.origin;
  return `${origin}${APP_BASE_PATH}${path}`;
}

export function getRequestOrigin(request: Request): string {
  const configured = getPublicSiteOrigin();
  if (configured) return configured;

  const url = new URL(request.url);
  if (process.env.NODE_ENV === "development") return url.origin;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";

  if (forwardedHost && !isVercelPreviewHost(forwardedHost)) {
    return `${proto}://${forwardedHost}`;
  }

  const host = request.headers.get("host");
  if (host && !isVercelPreviewHost(host)) {
    return `${proto}://${host}`;
  }

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
