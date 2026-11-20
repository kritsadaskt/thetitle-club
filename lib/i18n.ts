import { hasLocale } from "next-intl";
import { routing, type AppLocale } from "@/i18n/routing";

/** Locale → Intl BCP 47 tag for dates/numbers shown to members */
export const localeToBcp47: Record<AppLocale, string> = {
  en: "en-US",
  th: "th-TH",
  ru: "ru-RU",
};

/** Paths that live outside `app/[locale]` (must not get /th or /ru prefixes). */
export function isLocaleAgnosticPath(path: string): boolean {
  const pathname = path.split("?")[0] ?? path;
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/")
  );
}

/** Read next-intl locale cookie for redirects from outside [locale] (e.g. /admin → login). */
export function localeFromCookie(fallback: AppLocale = routing.defaultLocale): AppLocale {
  if (typeof document === "undefined") return fallback;
  const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  return hasLocale(routing.locales, value) ? value : fallback;
}

/** Login path with locale prefix for use with next/navigation (not next-intl router). */
export function localizedLoginPath(query?: string): string {
  const q = query ? (query.startsWith("?") ? query : `?${query}`) : "";
  return `/${localeFromCookie()}/login${q}`;
}

export type I18nLocaleMap = Partial<Record<"th" | "ru", Record<string, string>>>;

/**
 * Prefer translation for `th`/`ru` when present; otherwise use the English column.
 */
export function pickLocalized(
  locale: string,
  english: string,
  i18n: I18nLocaleMap | null | undefined,
  field: string
): string {
  if (locale === "en" || !i18n) return english;
  if (locale !== "th" && locale !== "ru") return english;
  const value = i18n[locale]?.[field];
  if (typeof value === "string" && value.trim() !== "") return value;
  return english;
}

export function emptyI18n(): I18nLocaleMap {
  return {};
}

/** Merge form locale fields into a jsonb payload (omit empty strings). */
export function buildI18nPayload(input: {
  th?: Record<string, string | undefined>;
  ru?: Record<string, string | undefined>;
}): I18nLocaleMap {
  const out: I18nLocaleMap = {};
  for (const loc of ["th", "ru"] as const) {
    const fields = input[loc];
    if (!fields) continue;
    const cleaned: Record<string, string> = {};
    for (const [key, val] of Object.entries(fields)) {
      if (typeof val === "string" && val.trim() !== "") {
        cleaned[key] = val.trim();
      }
    }
    if (Object.keys(cleaned).length > 0) out[loc] = cleaned;
  }
  return out;
}
