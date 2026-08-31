/** Next.js `basePath` — keep in sync with `next.config.ts`. */
export const APP_BASE_PATH = "/club";

/** Client-only absolute URL inside the app (includes `/club`). */
export function absoluteAppUrl(pathAndQuery: string): string {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  return `${window.location.origin}${APP_BASE_PATH}${path}`;
}

export function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  if (process.env.NODE_ENV === "development") return url.origin;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) return `${proto}://${forwardedHost}`;
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
