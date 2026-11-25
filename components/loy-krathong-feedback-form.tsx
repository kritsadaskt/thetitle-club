"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { AppLocale } from "@/i18n/routing";
import {
  FEEDBACK_SECTIONS,
  type FeedbackSection,
  type FeedbackSide,
  type LoyKrathongLocationSlug,
} from "@/lib/loy-krathong-feedback";
import { submitLoyKrathongFeedback } from "@/lib/supabase/data";
import { cn } from "@/lib/utils";

type SelectionState = Record<FeedbackSection, Record<FeedbackSide, string[]>>;
type OtherState = Record<FeedbackSection, Record<FeedbackSide, string>>;

function emptySelections(): SelectionState {
  return {
    food: { positive: [], improve: [] },
    venue: { positive: [], improve: [] },
    activities: { positive: [], improve: [] },
  };
}

function emptyOthers(): OtherState {
  return {
    food: { positive: "", improve: "" },
    venue: { positive: "", improve: "" },
    activities: { positive: "", improve: "" },
  };
}

type Props = {
  locationSlug: LoyKrathongLocationSlug;
  locationName: string;
};

export function LoyKrathongFeedbackForm({ locationSlug, locationName }: Props) {
  const t = useTranslations("loyKrathong");
  const tNav = useTranslations("nav");
  const locale = useLocale() as AppLocale;

  const [selections, setSelections] = useState<SelectionState>(emptySelections);
  const [others, setOthers] = useState<OtherState>(emptyOthers);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const totalSelected = useMemo(() => {
    let n = 0;
    for (const section of FEEDBACK_SECTIONS) {
      n += selections[section.id].positive.length;
      n += selections[section.id].improve.length;
    }
    return n;
  }, [selections]);

  const toggleOption = (
    section: FeedbackSection,
    side: FeedbackSide,
    optionId: string,
    exclusive?: boolean
  ) => {
    setSelections((prev) => {
      const current = prev[section][side];
      const selected = current.includes(optionId);
      let next: string[];
      if (selected) {
        next = current.filter((id) => id !== optionId);
      } else if (exclusive) {
        next = [optionId];
      } else {
        next = [...current.filter((id) => id !== "none"), optionId];
      }
      return {
        ...prev,
        [section]: { ...prev[section], [side]: next },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (totalSelected < 1) {
      setError(t("needOne"));
      return;
    }

    setSaving(true);
    const result = await submitLoyKrathongFeedback({
      locationSlug,
      locale,
      foodPositive: selections.food.positive,
      foodImprove: selections.food.improve,
      foodPositiveOther: others.food.positive,
      foodImproveOther: others.food.improve,
      venuePositive: selections.venue.positive,
      venueImprove: selections.venue.improve,
      venuePositiveOther: others.venue.positive,
      venueImproveOther: others.venue.improve,
      activitiesPositive: selections.activities.positive,
      activitiesImprove: selections.activities.improve,
      activitiesPositiveOther: others.activities.positive,
      activitiesImproveOther: others.activities.improve,
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.error === "Select at least one option." ? t("needOne") : t("errorGeneric"));
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-cream-100">
      <header
        className="bg-linear-to-b from-middle-blue to-deep-blue px-6 py-5"
        style={{ backgroundImage: "url('/club/club-bg.webp')" }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <img
            src={process.env.NEXT_PUBLIC_LOGO_IMAGE_URL_WHITE}
            alt={tNav("logoAlt")}
            className="w-24 h-auto object-contain"
          />
          <LanguageSwitcher variant="dark" mode="pills" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        {submitted ? (
          <div className="card p-10 text-center">
            <CheckCircle2 size={40} className="text-primary mx-auto mb-4" strokeWidth={1.5} />
            <h1 className="text-forest text-2xl font-semibold">{t("thanksTitle")}</h1>
            <p className="text-ink-light text-sm mt-3">{t("thanksMessage")}</p>
            <p className="text-ink-muted text-xs mt-6 tracking-wide uppercase">
              {t("thanksSignoff")}
            </p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <div className="card overflow-hidden">
              <div className="relative overflow-hidden bg-linear-to-b from-middle-blue to-deep-blue px-6 py-8 sm:px-8">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                >
                  <div
                    className="absolute inset-y-0 right-0 w-[72%] sm:w-[60%] bg-cover bg-[position:42%_38%] opacity-[0.42] sm:opacity-50"
                    style={{
                      backgroundImage: "url('/club/feedback/loy-krathong-hero.jpg?v=2')",
                      WebkitMaskImage:
                        "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 24%, black 58%)",
                      maskImage:
                        "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 24%, black 58%)",
                    }}
                  />
                  <div className="absolute inset-0 bg-linear-to-r from-middle-blue via-middle-blue/65 to-transparent sm:via-middle-blue/40" />
                  <div className="absolute inset-0 bg-linear-to-b from-deep-blue/25 via-transparent to-deep-blue/60" />
                </div>
                <div className="relative z-10 max-w-[18rem] sm:max-w-sm pr-2">
                  <p className="section-eyebrow text-primary">{t("eyebrow")}</p>
                  <h1 className="text-cream text-2xl sm:text-3xl font-light mt-2">
                    {t("eventTitle")}
                  </h1>
                  <p className="text-cream/80 text-sm mt-3">{locationName}</p>
                  <p className="text-cream/70 text-sm mt-1">{t("dateTime")}</p>
                  <p className="text-primary/90 text-xs mt-4">{t("multiHint")}</p>
                </div>
              </div>
            </div>

            {FEEDBACK_SECTIONS.map((section) => (
              <section key={section.id} className="card p-5 sm:p-6 space-y-5">
                <div>
                  <h2 className="text-forest text-lg font-semibold">
                    {t(`sections.${section.id}.title`)}
                  </h2>
                  <p className="text-ink-light text-sm mt-1">
                    {t(`sections.${section.id}.question`)}
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  {(["positive", "improve"] as FeedbackSide[]).map((side) => {
                    const options = side === "positive" ? section.positive : section.improve;
                    const selected = selections[section.id][side];
                    return (
                      <div
                        key={side}
                        className="rounded-xl border border-cream-300 bg-cream-50/50 p-4 space-y-3"
                      >
                        <p className="text-xs font-semibold tracking-[2px] uppercase text-forest">
                          {side === "positive" ? t("positive") : t("improve")}
                        </p>
                        <div className="space-y-2">
                          {options.map((opt) => {
                            const checked = selected.includes(opt.id);
                            return (
                              <div key={opt.id} className="space-y-2">
                                <label
                                  className={cn(
                                    "flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-colors",
                                    checked
                                      ? "border-primary bg-primary/10 text-forest"
                                      : "border-cream-300 bg-white text-ink hover:bg-cream-50"
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 accent-[var(--color-primary)]"
                                    checked={checked}
                                    onChange={() =>
                                      toggleOption(section.id, side, opt.id, opt.exclusive)
                                    }
                                  />
                                  <span>
                                    {t(`options.${section.id}.${side}.${opt.id}`)}
                                  </span>
                                </label>
                                {opt.opensOther && checked && (
                                  <textarea
                                    rows={2}
                                    maxLength={500}
                                    value={others[section.id][side]}
                                    onChange={(e) =>
                                      setOthers((prev) => ({
                                        ...prev,
                                        [section.id]: {
                                          ...prev[section.id],
                                          [side]: e.target.value,
                                        },
                                      }))
                                    }
                                    placeholder={t("otherPlaceholder")}
                                    className="input-field text-sm"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary w-full sm:w-auto"
            >
              {saving ? t("submitting") : t("submit")}
            </button>

            <p className="text-center text-[11px] text-ink-muted pb-8">
              {t("thanksSignoff")}
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
