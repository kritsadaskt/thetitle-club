"use client";

import { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { formatEventSchedule, surveyPublicPath, venuePublicPath } from "@/lib/events";
import { localeToBcp47 } from "@/lib/i18n";
import {
  fetchEventVenue,
  fetchMyEventRegistration,
  fetchMyVenueSurveyResponse,
  fetchVenueSurvey,
  fetchVenueSurveyQuestions,
  submitVenueSurvey,
} from "@/lib/supabase/data";
import {
  getCachedEventVenue,
  getCachedRegistration,
  getCachedSurveyBundle,
  invalidateSurveyCacheForVenue,
  setCachedEventVenue,
  setCachedRegistration,
  setCachedSurveyBundle,
} from "@/lib/survey-page-cache";
import type {
  ClubEvent,
  EventRegistration,
  EventSurveyAnswerInput,
  EventSurveyQuestion,
  EventSurveyResponse,
  EventVenue,
  EventVenueSurvey,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type AnswersState = Record<
  string,
  { rating?: number; optionId?: string; yesno?: boolean; text?: string }
>;

/** 1–5 scale: below half means 1 or 2 → show follow-up feedback. */
const LOW_RATING_THRESHOLD = 3;

function isLowRating(rating: number | undefined): boolean {
  return typeof rating === "number" && rating < LOW_RATING_THRESHOLD;
}

export default function EventVenueSurveyPage() {
  const t = useTranslations("events");
  const tNav = useTranslations("nav");
  const locale = useLocale() as AppLocale;
  const bcp47 = localeToBcp47[locale] ?? "en-US";
  const params = useParams<{ slug: string; venueSlug: string }>();
  const eventSlug = decodeURIComponent(params.slug);
  const venueSlug = decodeURIComponent(params.venueSlug);
  const { member, isAdmin, isLoading } = useAuth();

  const [event, setEvent] = useState<ClubEvent | null | undefined>(() =>
    getCachedEventVenue(eventSlug, venueSlug, locale)?.event ?? undefined
  );
  const [venue, setVenue] = useState<EventVenue | null>(
    () => getCachedEventVenue(eventSlug, venueSlug, locale)?.venue ?? null
  );
  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [survey, setSurvey] = useState<EventVenueSurvey | null>(null);
  const [questions, setQuestions] = useState<EventSurveyQuestion[]>([]);
  const [existing, setExisting] = useState<EventSurveyResponse | null>(null);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loadingSurvey, setLoadingSurvey] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedEventVenue(eventSlug, venueSlug, locale);
    if (cached) {
      setEvent(cached.event);
      setVenue(cached.venue);
    }
    void (async () => {
      const result = await fetchEventVenue(eventSlug, venueSlug, locale);
      if (cancelled) return;
      if (!result) {
        setEvent(null);
        setVenue(null);
        return;
      }
      setCachedEventVenue(eventSlug, venueSlug, locale, result.event, result.venue);
      setEvent(result.event);
      setVenue(result.venue);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventSlug, venueSlug, locale]);

  useEffect(() => {
    if (!member || !event) {
      setRegistration(null);
      return;
    }
    let cancelled = false;
    const cached = getCachedRegistration(event.id, member.id);
    if (cached !== undefined) setRegistration(cached);
    void (async () => {
      const row = await fetchMyEventRegistration(event.id);
      if (cancelled) return;
      setCachedRegistration(event.id, member.id, row);
      setRegistration(row);
    })();
    return () => {
      cancelled = true;
    };
  }, [member, event]);

  const registeredHere = Boolean(
    registration && !registration.cancelledAt && registration.venueId === venue?.id
  );

  useEffect(() => {
    // Admins can preview the form without registering; members need a registration here.
    if (!venue || !member || (!isAdmin && !registeredHere)) {
      // Keep cached form visible while auth/registration is still resolving.
      if (!member || (!isAdmin && registration !== null && !registeredHere)) {
        setSurvey(null);
        setQuestions([]);
        setExisting(null);
        setSubmitted(false);
      }
      return;
    }

    const mode = isAdmin && !registeredHere ? "preview" : "member";
    const cached = getCachedSurveyBundle(venue.id, locale, member.id, mode);
    let cancelled = false;

    if (cached) {
      setSurvey(cached.survey);
      setQuestions(cached.questions);
      setExisting(cached.existing);
      setSubmitted(cached.submitted);
      setLoadingSurvey(false);
    } else {
      setLoadingSurvey(true);
    }

    void (async () => {
      const [s, qs, mine] = await Promise.all([
        fetchVenueSurvey(venue.id),
        fetchVenueSurveyQuestions(venue.id, locale),
        mode === "preview" ? Promise.resolve(null) : fetchMyVenueSurveyResponse(venue.id),
      ]);
      if (cancelled) return;
      const bundle = {
        survey: s,
        questions: qs,
        existing: mine,
        submitted: Boolean(mine),
      };
      setCachedSurveyBundle(venue.id, locale, member.id, mode, bundle);
      setSurvey(bundle.survey);
      setQuestions(bundle.questions);
      setExisting(bundle.existing);
      setSubmitted(bundle.submitted);
      setLoadingSurvey(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [venue, member, registeredHere, isAdmin, locale, registration]);

  const surveyPath = surveyPublicPath(eventSlug, venueSlug);
  const loginHref = `/login?next=${encodeURIComponent(surveyPath)}`;
  const membershipActive = member?.status === "active";
  const started = venue ? new Date(venue.startsAt).getTime() <= Date.now() : false;
  const surveyOpen = Boolean(survey?.isActive) && started && questions.length > 0;
  const canSubmitForReal = Boolean(
    member && membershipActive && registeredHere && surveyOpen && !existing && !submitted
  );
  /** Admin-only: view/interact with the live form when guests cannot submit yet. */
  const isAdminPreview = Boolean(isAdmin && questions.length > 0 && !canSubmitForReal);
  const canShowForm = canSubmitForReal || isAdminPreview;

  const setAnswer = (questionId: string, patch: AnswersState[string]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venue) return;
    if (!canSubmitForReal) {
      setError(t("survey.previewSubmitBlocked"));
      return;
    }
    const payload: EventSurveyAnswerInput[] = [];
    for (const q of questions) {
      const a = answers[q.id];
      const empty =
        !a ||
        (q.questionType === "rating" && a.rating === undefined) ||
        (q.questionType === "single" && !a.optionId) ||
        (q.questionType === "yesno" && a.yesno === undefined) ||
        (q.questionType === "text" && !a.text?.trim());
      if (empty) {
        if (q.required) {
          setError(t("survey.missingRequired"));
          return;
        }
        continue;
      }
      if (q.questionType === "rating") {
        if (isLowRating(a!.rating) && !a!.text?.trim()) {
          setError(t("survey.lowRatingFeedbackRequired"));
          return;
        }
        payload.push({
          questionId: q.id,
          rating: a!.rating,
          ...(isLowRating(a!.rating) ? { text: a!.text?.trim() } : {}),
        });
      } else if (q.questionType === "single") {
        payload.push({ questionId: q.id, optionId: a!.optionId });
      } else if (q.questionType === "yesno") {
        payload.push({ questionId: q.id, yesno: a!.yesno });
      } else {
        payload.push({ questionId: q.id, text: a!.text?.trim() });
      }
    }

    setSaving(true);
    setError(null);
    const res = await submitVenueSurvey(venue.id, payload);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    invalidateSurveyCacheForVenue(venue.id);
    setSubmitted(true);
  };

  const headerLink = useMemo(() => {
    if (member) {
      if (isAdmin) {
        return (
          <NextLink href="/admin" className="text-white/80 hover:text-white text-sm">
            {t("admin")}
          </NextLink>
        );
      }
      return (
        <Link href="/dashboard" className="text-white/80 hover:text-white text-sm">
          {t("dashboard")}
        </Link>
      );
    }
    return (
      <Link href={loginHref} className="text-white/80 hover:text-white text-sm">
        {t("signIn")}
      </Link>
    );
  }, [member, isAdmin, loginHref, t]);

  return (
    <div className="min-h-screen bg-cream-100">
      <header
        className="bg-deep-blue px-6 py-5"
        style={{ backgroundImage: "url('/club/club-bg.webp')" }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <Link href="/">
            <img
              src={process.env.NEXT_PUBLIC_LOGO_IMAGE_URL_WHITE}
              alt={tNav("logoAlt")}
              className="w-24 h-auto object-contain"
            />
          </Link>
          {headerLink}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6">
        {event === undefined || isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : !event || !venue ? (
          <div className="bg-white border border-cream-300 rounded-2xl p-10 text-center shadow-card">
            <ClipboardList size={32} className="text-ink-muted mx-auto mb-3" strokeWidth={1} />
            <h1 className="text-forest font-semibold text-xl">{t("survey.notFoundTitle")}</h1>
            <p className="text-ink-muted text-sm mt-2">{t("survey.notFoundMessage")}</p>
            <Link
              href={member && !isAdmin ? "/dashboard" : "/"}
              className="inline-block mt-6 text-primary-dark text-sm font-medium"
            >
              {member && !isAdmin ? t("backToDashboard") : t("backToClub")}
            </Link>
          </div>
        ) : (
          <article className="bg-white border border-cream-300 rounded-2xl overflow-hidden shadow-card">
            {venue.bannerImage ? (
              <img src={venue.bannerImage} alt="" className="w-full h-40 object-cover" />
            ) : (
              <div
                className="h-28 bg-forest-900 flex items-center justify-center"
                style={{ backgroundImage: "url('/club/club-bg.webp')" }}
              >
                <ClipboardList size={28} className="text-primary" />
              </div>
            )}
            <div className="p-6 sm:p-8">
              <p className="text-primary-dark text-xs font-semibold tracking-[2px] uppercase">
                {t("survey.eyebrow")}
              </p>
              <h1 className="text-forest text-2xl font-semibold mt-2 break-words">
                {t("survey.title")}
              </h1>
              <p className="text-ink-muted text-sm mt-2">
                {event.title} · {venue.name}
              </p>
              <p className="text-ink-light text-sm mt-2">
                {formatEventSchedule(venue.startsAt, venue.endsAt, bcp47)}
              </p>

              <div className="mt-8 border-t border-cream-200 pt-6 space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {error}
                  </div>
                )}

                {isAdminPreview && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p className="font-semibold">{t("survey.previewBannerTitle")}</p>
                    <p className="text-xs mt-1 text-amber-800/90">{t("survey.previewBannerBody")}</p>
                  </div>
                )}

                {!member && (
                  <Link
                    href={loginHref}
                    className="btn-primary inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold"
                  >
                    {t("survey.signInPrompt")}
                  </Link>
                )}

                {member && !isAdmin && !membershipActive && (
                  <p className="text-ink-muted text-sm">{t("survey.membershipMustBeActive")}</p>
                )}

                {member && !isAdmin && membershipActive && !registeredHere && (
                  <div className="space-y-3">
                    <p className="text-ink-muted text-sm">{t("survey.notRegistered")}</p>
                    <Link
                      href={venuePublicPath(event.slug, venue.slug)}
                      className="text-primary-dark text-sm font-medium"
                    >
                      {t("survey.backToLocation")}
                    </Link>
                  </div>
                )}

                {member && (isAdmin || registeredHere) && loadingSurvey && (
                  <div className="flex justify-center py-8">
                    <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                )}

                {member &&
                  !isAdminPreview &&
                  membershipActive &&
                  registeredHere &&
                  !loadingSurvey &&
                  (existing || submitted) && (
                    <div className="text-center py-6 space-y-3">
                      <CheckCircle2 className="mx-auto text-emerald-600" size={36} />
                      <h2 className="text-forest font-semibold text-lg">
                        {t("survey.thanksTitle")}
                      </h2>
                      <p className="text-ink-muted text-sm">{t("survey.thanksMessage")}</p>
                      {existing && (
                        <p className="text-[11px] text-ink-muted">{t("survey.alreadySubmitted")}</p>
                      )}
                    </div>
                  )}

                {member &&
                  !isAdminPreview &&
                  membershipActive &&
                  registeredHere &&
                  !loadingSurvey &&
                  !existing &&
                  !submitted &&
                  !started && (
                    <p className="text-ink-muted text-sm">{t("survey.notOpenYet")}</p>
                  )}

                {member &&
                  !isAdminPreview &&
                  membershipActive &&
                  registeredHere &&
                  !loadingSurvey &&
                  !existing &&
                  !submitted &&
                  started &&
                  (!survey?.isActive || questions.length === 0) && (
                    <p className="text-ink-muted text-sm">
                      {questions.length === 0 ? t("survey.noQuestions") : t("survey.closed")}
                    </p>
                  )}

                {isAdmin && !loadingSurvey && questions.length === 0 && (
                  <p className="text-ink-muted text-sm">{t("survey.noQuestions")}</p>
                )}

                {canShowForm && (
                  <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
                    {questions.map((q, index) => (
                      <fieldset key={q.id} className="space-y-2">
                        <legend className="text-forest text-sm font-medium">
                          {index + 1}. {q.prompt}
                          {q.required && (
                            <span className="text-ink-muted font-normal"> · {t("survey.required")}</span>
                          )}
                        </legend>

                        {q.questionType === "rating" && (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("survey.ratingLabel")}>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() =>
                                    setAnswer(q.id, {
                                      rating: n,
                                      ...(n >= LOW_RATING_THRESHOLD ? { text: undefined } : {}),
                                    })
                                  }
                                  className={cn(
                                    "h-10 w-10 rounded-xl border text-sm font-semibold",
                                    answers[q.id]?.rating === n
                                      ? "border-primary bg-primary text-forest"
                                      : "border-cream-300 bg-white text-forest hover:bg-cream-100"
                                  )}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                            {isLowRating(answers[q.id]?.rating) && (
                              <div className="space-y-1.5">
                                <p className="text-xs text-ink-muted">
                                  {t("survey.lowRatingFeedbackLabel")}{" "}
                                  <span className="text-ink-muted font-normal">· {t("survey.required")}</span>
                                </p>
                                <textarea
                                  rows={3}
                                  maxLength={2000}
                                  required
                                  value={answers[q.id]?.text ?? ""}
                                  onChange={(e) => setAnswer(q.id, { text: e.target.value })}
                                  placeholder={t("survey.lowRatingFeedbackPlaceholder")}
                                  className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {q.questionType === "single" && (
                          <div className="space-y-2">
                            {q.options.map((opt) => (
                              <label
                                key={opt.id}
                                className={cn(
                                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm cursor-pointer",
                                  answers[q.id]?.optionId === opt.id
                                    ? "border-primary bg-primary/10"
                                    : "border-cream-300 bg-white hover:bg-cream-50"
                                )}
                              >
                                <input
                                  type="radio"
                                  name={`q-${q.id}`}
                                  checked={answers[q.id]?.optionId === opt.id}
                                  onChange={() => setAnswer(q.id, { optionId: opt.id })}
                                  className="accent-primary"
                                />
                                <span className="text-forest">{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {q.questionType === "yesno" && (
                          <div className="flex gap-2">
                            {[
                              { value: true, label: t("survey.yes") },
                              { value: false, label: t("survey.no") },
                            ].map((opt) => (
                              <button
                                key={String(opt.value)}
                                type="button"
                                onClick={() => setAnswer(q.id, { yesno: opt.value })}
                                className={cn(
                                  "rounded-xl border px-4 py-2 text-sm font-medium",
                                  answers[q.id]?.yesno === opt.value
                                    ? "border-primary bg-primary text-forest"
                                    : "border-cream-300 bg-white text-forest hover:bg-cream-100"
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {q.questionType === "text" && (
                          <textarea
                            rows={3}
                            maxLength={2000}
                            value={answers[q.id]?.text ?? ""}
                            onChange={(e) => setAnswer(q.id, { text: e.target.value })}
                            placeholder={t("survey.textPlaceholder")}
                            className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                        )}
                      </fieldset>
                    ))}

                    <button
                      type="submit"
                      disabled={saving || !canSubmitForReal}
                      className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
                    >
                      {canSubmitForReal
                        ? saving
                          ? t("survey.submitting")
                          : t("survey.submit")
                        : t("survey.previewSubmit")}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
