"use client";

import type { I18nLocaleMap } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const inputClass =
  "mt-1 w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60";

/** Read one translated field from an i18n map ("" when missing). */
export function getLocaleField(
  i18n: I18nLocaleMap | undefined,
  locale: "th" | "ru",
  field: string
): string {
  return i18n?.[locale]?.[field] ?? "";
}

/** Immutably set one translated field in an i18n map. */
export function setLocaleField(
  i18n: I18nLocaleMap | undefined,
  locale: "th" | "ru",
  field: string,
  value: string
): I18nLocaleMap {
  return {
    ...i18n,
    [locale]: { ...(i18n?.[locale] ?? {}), [field]: value },
  };
}

type Props = {
  /** English field label, e.g. "Title" — shown as "Title translations (optional)". */
  label: string;
  valueTh: string;
  valueRu: string;
  onChangeTh: (value: string) => void;
  onChangeRu: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

/** Compact optional Thai / Russian inputs to place under an English field. */
export function LocaleTextFields({
  label,
  valueTh,
  valueRu,
  onChangeTh,
  onChangeRu,
  multiline = false,
  rows = 2,
  placeholder,
  disabled,
  className,
}: Props) {
  const renderInput = (
    locale: "Thai" | "Russian",
    value: string,
    onChange: (v: string) => void
  ) => (
    <label className="block">
      <span className="text-ink-muted text-[11px] font-medium">{locale}</span>
      {multiline ? (
        <textarea
          rows={rows}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      ) : (
        <input
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </label>
  );

  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-cream-300 bg-cream-50/60 p-3",
        className
      )}
    >
      <p className="text-ink-muted text-[11px] font-semibold uppercase tracking-wide">
        {label} translations (optional)
      </p>
      <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {renderInput("Thai", valueTh, onChangeTh)}
        {renderInput("Russian", valueRu, onChangeRu)}
      </div>
    </div>
  );
}
