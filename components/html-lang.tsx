"use client";

import { useEffect } from "react";

/** Syncs <html lang> for localized routes (root layout stays shared with /admin). */
export function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
