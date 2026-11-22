"use client";

import { useEffect, useId, useState } from "react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cn } from "@/lib/utils";

type Props = {
  isSignedIn: boolean;
  memberEntryHref: string;
  memberEntryLabel?: string;
};

export function LandingNav({
  isSignedIn,
  memberEntryHref,
  memberEntryLabel,
}: Props) {
  const t = useTranslations("landing.nav");
  const tNav = useTranslations("nav");
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const isAdminHref = memberEntryHref.startsWith("/admin");
  const entryLabel =
    memberEntryLabel ?? (isAdminHref ? t("goToDashboard") : t("viewProfile"));

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  const desktopAuth = isSignedIn ? (
    <>
      {isAdminHref ? (
        <NextLink
          href={memberEntryHref}
          className="btn-primary font-semibold px-5 py-2.5 rounded-lg"
        >
          {entryLabel}
        </NextLink>
      ) : (
        <Link
          href={memberEntryHref}
          className="btn-primary font-semibold px-5 py-2.5 rounded-lg"
        >
          {entryLabel}
        </Link>
      )}
      <button
        type="button"
        className="btn-outline-primary text-sm"
        onClick={() => void logout()}
      >
        {t("logOut")}
      </button>
    </>
  ) : (
    <>
      <Link
        href="/login"
        className="text-sm text-ink-light hover:text-primary-dark transition-colors font-medium"
      >
        {t("signIn")}
      </Link>
      <Link
        href="/register"
        className="btn-primary font-semibold px-5 py-2.5 rounded-lg"
      >
        {t("becomeMember")}
      </Link>
    </>
  );

  const drawerLinkClass =
    "block w-full rounded-xl px-4 py-3.5 text-base font-medium text-forest transition-colors hover:bg-cream-100";

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-b border-cream-300">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="shrink-0" onClick={close}>
            <img
              src="/club/the-title-club_logo-400p.webp"
              alt={tNav("logoAlt")}
              className="w-20 h-auto object-contain"
            />
          </Link>

          {/* Desktop: language + auth */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher variant="light" />
            {desktopAuth}
          </div>

          {/* Mobile: language + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher variant="light" />
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-cream-300 text-forest hover:bg-cream-100 transition-colors"
              aria-expanded={open}
              aria-controls={panelId}
              aria-label={open ? t("closeMenu") : t("openMenu")}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Drawer must sit outside nav — backdrop-filter creates a containing block for fixed */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-[60] transition-[visibility] duration-300",
          open ? "visible" : "invisible pointer-events-none"
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-forest-950/45 transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0"
          )}
          aria-label={t("closeMenu")}
          onClick={close}
        />

        <aside
          id={panelId}
          role="dialog"
          aria-modal="true"
          className={cn(
            "absolute top-0 right-0 flex h-full w-[min(20rem,88vw)] flex-col bg-white shadow-card-hover transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-cream-300 px-5">
            <p className="text-sm font-semibold tracking-wide text-forest">
              {t("menu")}
            </p>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-cream-100 hover:text-forest"
              aria-label={t("closeMenu")}
              onClick={close}
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
            {isSignedIn ? (
              <>
                {isAdminHref ? (
                  <NextLink
                    href={memberEntryHref}
                    className={cn(drawerLinkClass, "bg-primary/15 text-primary-dark")}
                    onClick={close}
                  >
                    {entryLabel}
                  </NextLink>
                ) : (
                  <Link
                    href={memberEntryHref}
                    className={cn(drawerLinkClass, "bg-primary/15 text-primary-dark")}
                    onClick={close}
                  >
                    {entryLabel}
                  </Link>
                )}
                <button
                  type="button"
                  className={cn(drawerLinkClass, "text-left text-red-600 hover:bg-red-50")}
                  onClick={() => {
                    close();
                    void logout();
                  }}
                >
                  {t("logOut")}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={drawerLinkClass} onClick={close}>
                  {t("signIn")}
                </Link>
                <Link
                  href="/register"
                  className="mt-2 block w-full rounded-xl bg-primary px-4 py-3.5 text-center text-base font-semibold text-forest-900"
                  onClick={close}
                >
                  {t("becomeMember")}
                </Link>
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
