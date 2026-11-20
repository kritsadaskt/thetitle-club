"use client";

import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";

type LandingNavAuthProps = {
  isSignedIn: boolean;
  memberEntryHref: string;
  /** Optional override; defaults to a translated label based on memberEntryHref */
  memberEntryLabel?: string;
};

export function LandingNavAuth({
  isSignedIn,
  memberEntryHref,
  memberEntryLabel,
}: LandingNavAuthProps) {
  const t = useTranslations("landing.nav");
  const { logout } = useAuth();

  if (isSignedIn) {
    const isAdminHref = memberEntryHref.startsWith("/admin");
    const label =
      memberEntryLabel ?? (isAdminHref ? t("goToDashboard") : t("viewProfile"));
    const entryClassName = "btn-primary font-semibold px-5 py-2.5 rounded-lg";

    return (
      <>
        {isAdminHref ? (
          // Admin lives outside the [locale] segment — use plain next/link
          <NextLink href={memberEntryHref} className={entryClassName}>
            {label}
          </NextLink>
        ) : (
          <Link href={memberEntryHref} className={entryClassName}>
            {label}
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
    );
  }

  return (
    <>
      <Link href="/login" className="text-sm text-ink-light hover:text-primary-dark transition-colors font-medium">
        {t("signIn")}
      </Link>
      <Link href="/register" className="btn-primary font-semibold px-5 py-2.5 rounded-lg">
        {t("becomeMember")}
      </Link>
    </>
  );
}
