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
};

export function LanguageSwitcher({ className, variant = "dark" }: Props) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
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
            open && "rotate-180",
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
            "absolute right-0 z-50 mt-1.5 min-w-[10.5rem] overflow-hidden rounded-xl border py-1 shadow-card",
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
