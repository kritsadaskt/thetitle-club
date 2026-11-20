import { defineRouting } from "next-intl/routing";

export const locales = ["en", "th", "ru"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});
