"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

type LandingNavAuthProps = {
  isSignedIn: boolean;
  memberEntryHref: string;
  memberEntryLabel: string;
};

export function LandingNavAuth({
  isSignedIn,
  memberEntryHref,
  memberEntryLabel,
}: LandingNavAuthProps) {
  const { logout } = useAuth();

  if (isSignedIn) {
    return (
      <>
        <Link href={memberEntryHref} className="btn-primary font-semibold px-5 py-2.5 rounded-lg">
          {memberEntryLabel}
        </Link>
        <button
          type="button"
          className="btn-outline-primary text-sm"
          onClick={() => void logout()}
        >
          Log out
        </button>
      </>
    );
  }

  return (
    <>
      <Link href="/login" className="text-sm text-ink-light hover:text-primary-dark transition-colors font-medium">
        Sign In
      </Link>
      <Link href="/register" className="btn-primary font-semibold px-5 py-2.5 rounded-lg">
        Become a Member
      </Link>
    </>
  );
}
