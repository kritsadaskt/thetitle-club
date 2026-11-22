"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LOCALES: Record<
  AppLocale,
  { flag: string; short: string; label: string }
> = {
  en: { flag: "🇬🇧", short: "EN", label: "English" },
  th: { flag: "🇹🇭", short: "TH", label: "ไทย" },
  ru: { flag: "🇷🇺", short: "RU", label: "Русский" },
};

type Props = {
  className?: string;
  /** Dark nav (landing / member sidebar) vs light */
  variant?: "dark" | "light";
  /** Inline EN/TH/RU pills (dashboard) vs flag dropdown (landing / auth) */
  mode?: "dropdown" | "pills";
  /** Where the dropdown list opens relative to the trigger */
  menuPlacement?: "below" | "above";
};

export function LanguageSwitcher({
  className,
  variant = "dark",
  mode = "dropdown",
  menuPlacement = "below",
}: Props) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();

  if (mode === "pills") {
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
              {LOCALES[loc].short}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <LanguageDropdown
      className={className}
      variant={variant}
      menuPlacement={menuPlacement}
      locale={locale}
      pathname={pathname}
    />
  );
}

function LanguageDropdown({
  className,
  variant,
  menuPlacement,
  locale,
  pathname,
}: {
  className?: string;
  variant: "dark" | "light";
  menuPlacement: "below" | "above";
  locale: AppLocale;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current = LOCALES[locale];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Language"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors",
          variant === "dark"
            ? "border-white/20 bg-white/5 text-white/85 hover:bg-white/10 hover:text-white"
            : "border-cream-300 bg-white text-forest hover:border-primary-dark/40 hover:bg-cream-50"
        )}
      >
        <span className="text-base leading-none" aria-hidden>
          {current.flag}
        </span>
        <span className="tracking-wide">{current.short}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={cn(
            "opacity-70 transition-transform",
            open && (menuPlacement === "above" ? "rotate-0" : "rotate-180"),
            !open && menuPlacement === "above" && "rotate-180",
            variant === "dark" ? "text-white/70" : "text-ink-muted"
          )}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          id={menuId}
          role="listbox"
          aria-label="Language"
          className={cn(
            "absolute right-0 z-50 min-w-[10.5rem] overflow-hidden rounded-xl border py-1 shadow-card",
            menuPlacement === "above" ? "bottom-full mb-1.5" : "top-full mt-1.5",
            variant === "dark"
              ? "border-white/15 bg-forest-900 text-white"
              : "border-cream-300 bg-white text-forest"
          )}
        >
          {routing.locales.map((loc) => {
            const item = LOCALES[loc];
            const active = loc === locale;
            return (
              <li key={loc} role="option" aria-selected={active}>
                <Link
                  href={pathname}
                  locale={loc}
                  replace
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                    active
                      ? variant === "dark"
                        ? "bg-primary/20 font-semibold text-primary"
                        : "bg-primary/15 font-semibold text-primary-dark"
                      : variant === "dark"
                        ? "text-white/80 hover:bg-white/8 hover:text-white"
                        : "text-ink-light hover:bg-cream-100 hover:text-forest"
                  )}
                >
                  <span className="text-base leading-none" aria-hidden>
                    {item.flag}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold tracking-wide",
                      active
                        ? variant === "dark"
                          ? "text-primary"
                          : "text-primary-dark"
                        : "opacity-45"
                    )}
                  >
                    {item.short}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
