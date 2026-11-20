"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LABELS: Record<AppLocale, string> = {
  en: "EN",
  th: "TH",
  ru: "RU",
};

type Props = {
  className?: string;
  /** Dark nav (landing / member sidebar) vs light */
  variant?: "dark" | "light";
};

export function LanguageSwitcher({ className, variant = "dark" }: Props) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border p-0.5 text-[11px] font-semibold tracking-wide",
        variant === "dark"
          ? "border-white/20 bg-white/5 text-white/50"
          : "border-cream-300 bg-cream-50 text-ink-muted",
        className
      )}
      role="group"
      aria-label="Language"
    >
      {routing.locales.map((loc) => {
        const active = loc === locale;
        return (
          <Link
            key={loc}
            href={pathname}
            locale={loc}
            replace
            className={cn(
              "min-w-[28px] rounded-full px-2 py-1 text-center transition-colors",
              active
                ? variant === "dark"
                  ? "bg-primary text-forest-900"
                  : "bg-forest-900 text-cream-100"
                : variant === "dark"
                  ? "hover:text-white"
                  : "hover:text-forest"
            )}
            aria-current={active ? "page" : undefined}
          >
            {LABELS[loc]}
          </Link>
        );
      })}
    </div>
  );
}
