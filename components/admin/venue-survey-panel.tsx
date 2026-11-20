"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { absoluteAppUrl } from "@/lib/app-url";
import { surveyPublicPath } from "@/lib/events";
import {
  createSurveyQuestion,
  deleteSurveyQuestion,
  fetchVenueSurvey,
  fetchVenueSurveyQuestions,
  fetchVenueSurveyResponses,
  fetchVenueSurveySummary,
  reorderSurveyQuestions,
  updateSurveyQuestion,
  upsertVenueSurveyActive,
} from "@/lib/supabase/data";
import type {
  ClubEvent,
  CreateEventSurveyQuestionInput,
  EventSurveyQuestion,
  EventVenue,
  EventVenueSurvey,
  EventVenueSurveySummary,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActiveToggle } from "./active-toggle";
import { SurveyQuestionForm } from "./survey-question-form";
import { VenueQrCard } from "./venue-qr-card";

type Props = {
  event: ClubEvent;
  venue: EventVenue;
};

const TYPE_LABEL: Record<EventSurveyQuestion["questionType"], string> = {
  rating: "Rating 1–5",
  single: "Single choice",
  yesno: "Yes / No",
  text: "Free text",
};

export function VenueSurveyPanel({ event, venue }: Props) {
  const [survey, setSurvey] = useState<EventVenueSurvey | null>(null);
  const [questions, setQuestions] = useState<EventSurveyQuestion[]>([]);
  const [summary, setSummary] = useState<EventVenueSurveySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventSurveyQuestion | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);

  const surveyUrl = absoluteAppUrl(surveyPublicPath(event.slug, venue.slug));

  const reload = useCallback(async () => {
    setLoading(true);
    const [s, qs, sum] = await Promise.all([
      fetchVenueSurvey(venue.id),
      fetchVenueSurveyQuestions(venue.id, "en"),
      fetchVenueSurveySummary(venue.id),
    ]);
    setSurvey(s);
    setQuestions(qs);
    setSummary(sum);
    setLoading(false);
  }, [venue.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleToggle = async (checked: boolean) => {
    if (checked && questions.length === 0) {
      setError("Add at least one question before opening the survey.");
      return;
    }
    setToggling(true);
    setError(null);
    const res = await upsertVenueSurveyActive(venue.id, event.id, checked);
    setToggling(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSurvey(res.data);
  };

  const handleSaveQuestion = async (input: CreateEventSurveyQuestionInput) => {
    if (editing) {
      const res = await updateSurveyQuestion(editing.id, {
        ...input,
        questionType: editing.hasAnswers ? editing.questionType : input.questionType,
      });
      if (!res.ok) return res;
      await reload();
      return { ok: true as const };
    }
    const res = await createSurveyQuestion(venue.id, {
      ...input,
      sortOrder: questions.length,
    });
    if (!res.ok) return res;
    await reload();
    return { ok: true as const };
  };

  const handleDelete = async (q: EventSurveyQuestion) => {
    if (q.hasAnswers) {
      setError("Cannot delete a question that already has answers.");
      return;
    }
    if (!window.confirm("Delete this question?")) return;
    const res = await deleteSurveyQuestion(q.id);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await reload();
  };

  const moveQuestion = async (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= questions.length) return;
    const ordered = [...questions];
    const tmp = ordered[index];
    ordered[index] = ordered[next];
    ordered[next] = tmp;
    setQuestions(ordered);
    const res = await reorderSurveyQuestions(
      venue.id,
      ordered.map((q) => q.id)
    );
    if (!res.ok) {
      setError(res.error);
      await reload();
    }
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const { rows } = await fetchVenueSurveyResponses(venue.id);
    const qs = await fetchVenueSurveyQuestions(venue.id, "en");
    const header = [
      "Member code",
      "Full name",
      "Email",
      "Location",
      "Submitted at",
      ...qs.map((q) => q.prompt),
    ];
    const sheetRows = rows.map((row) => {
      const byQ = new Map(row.answers.map((a) => [a.questionId, a]));
      return [
        row.memberCode ?? "",
        row.fullName ?? "",
        row.email ?? "",
        venue.name,
        row.submittedAt,
        ...qs.map((q) => {
          const a = byQ.get(q.id);
          if (!a) return "";
          if (a.questionType === "rating") return a.ratingValue ?? "";
          if (a.questionType === "single") return a.optionLabelSnapshot ?? "";
          if (a.questionType === "yesno") return a.yesnoValue ? "Yes" : "No";
          return a.textValue ?? "";
        }),
      ];
    });
    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([header, ...sheetRows]);
    XLSX.utils.book_append_sheet(book, sheet, "Survey");
    XLSX.writeFile(book, `${event.slug}__${venue.slug}-survey.xlsx`);
  };

  return (
    <div className="mt-4 border-t border-cream-200 pt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-forest text-sm font-semibold">Exit survey</h4>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-ink-muted hover:text-forest inline-flex items-center gap-1"
        >
          {expanded ? "Hide" : "Manage"}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <VenueQrCard
          value={surveyUrl}
          title="Exit survey QR"
          fileBaseName={`${event.slug}__${venue.slug}__survey`}
        />
        <div className="flex-1 min-w-0 space-y-2">
          <ActiveToggle
            checked={Boolean(survey?.isActive)}
            onChange={(checked) => {
              if (!toggling) void handleToggle(checked);
            }}
            label={survey?.isActive ? "Survey open" : "Survey closed"}
          />
          <p className="text-[11px] text-ink-muted break-all">{surveyUrl}</p>
          <p className="text-[10px] text-ink-muted">
            Opens after the location start time. Print this QR for guests leaving the event.
          </p>
          {summary && (
            <p className="text-xs text-ink-muted">
              {summary.responseCount} response{summary.responseCount === 1 ? "" : "s"} ·{" "}
              {questions.length} question{questions.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </div>
      )}

      {expanded && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
              Questions
            </p>
            <button
              type="button"
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-cream-300 bg-white px-3 py-1.5 text-xs text-forest hover:bg-cream-100"
            >
              <Plus size={12} /> Add question
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-ink-muted">Loading…</p>
          ) : questions.length === 0 ? (
            <p className="text-xs text-ink-muted">No questions yet.</p>
          ) : (
            <ul className="space-y-2">
              {questions.map((q, index) => (
                <li
                  key={q.id}
                  className="rounded-xl border border-cream-200 bg-white px-3 py-2 flex gap-2 items-start"
                >
                  <div className="flex flex-col gap-0.5 pt-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => void moveQuestion(index, -1)}
                      className="text-ink-muted disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={index === questions.length - 1}
                      onClick={() => void moveQuestion(index, 1)}
                      className="text-ink-muted disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-forest font-medium break-words">{q.prompt}</p>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {TYPE_LABEL[q.questionType]}
                      {q.required ? " · Required" : " · Optional"}
                      {q.hasAnswers ? " · Has answers" : ""}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(q);
                        setFormOpen(true);
                      }}
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-cream-100"
                      aria-label="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={q.hasAnswers}
                      onClick={() => void handleDelete(q)}
                      className={cn(
                        "rounded-lg p-1.5 text-ink-muted hover:bg-cream-100",
                        q.hasAnswers && "opacity-30 cursor-not-allowed"
                      )}
                      aria-label="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {summary && summary.responseCount > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                  Results ({summary.responseCount})
                </p>
                <button
                  type="button"
                  onClick={() => void exportExcel()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-cream-300 bg-white px-3 py-1.5 text-xs text-forest hover:bg-cream-100"
                >
                  <Download size={12} /> Export Excel
                </button>
              </div>
              {summary.questions.map((q) => (
                <div key={q.questionId} className="rounded-xl border border-cream-200 bg-cream-50/50 p-3">
                  <p className="text-sm text-forest font-medium">{q.prompt}</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {q.responseCount} answer{q.responseCount === 1 ? "" : "s"}
                  </p>
                  {q.questionType === "rating" && q.ratingDistribution && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-forest">
                        Average:{" "}
                        {q.averageRating !== undefined ? q.averageRating.toFixed(2) : "—"}
                      </p>
                      {([5, 4, 3, 2, 1] as const).map((n) => (
                        <p key={n} className="text-[11px] text-ink-muted">
                          {n}: {q.ratingDistribution?.[n] ?? 0}
                        </p>
                      ))}
                    </div>
                  )}
                  {q.questionType === "single" && q.optionCounts && (
                    <ul className="mt-2 space-y-1">
                      {q.optionCounts.map((opt) => (
                        <li key={opt.optionId} className="text-[11px] text-ink-muted">
                          {opt.label}: {opt.count}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.questionType === "yesno" && (
                    <p className="mt-2 text-[11px] text-ink-muted">
                      Yes: {q.yesCount ?? 0} · No: {q.noCount ?? 0}
                    </p>
                  )}
                  {q.questionType === "text" && q.textAnswers && q.textAnswers.length > 0 && (
                    <ul className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                      {q.textAnswers.map((row, i) => (
                        <li key={`${row.submittedAt}-${i}`} className="text-[11px] text-ink-light">
                          <span className="font-medium text-forest">{row.memberName}: </span>
                          {row.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <SurveyQuestionForm
        open={formOpen}
        initial={editing}
        title={editing ? "Edit question" : "Add question"}
        submitLabel={editing ? "Save" : "Add"}
        lockType={Boolean(editing?.hasAnswers)}
        onClose={() => {
          setFormOpen(false);
          setEditing(undefined);
        }}
        onSubmit={handleSaveQuestion}
      />
    </div>
  );
}
