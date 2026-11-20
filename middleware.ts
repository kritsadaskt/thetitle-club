import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const handleI18nRouting = createMiddleware(routing);

function shouldSkipI18n(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth")
  );
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldSkipI18n(pathname)) {
    return await updateSession(request);
  }

  const i18nResponse = handleI18nRouting(request);
  const sessionResponse = await updateSession(request);
  copyCookies(sessionResponse, i18nResponse);
  return i18nResponse;
}

export const config = {
  matcher: [
    // Root must be listed so next-intl can redirect / → /en (or Accept-Language)
    "/",
    "/(th|en|ru)/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
