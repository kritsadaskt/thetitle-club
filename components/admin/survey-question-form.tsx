"use client";

import { useEffect, useState } from "react";
import type {
  CreateEventSurveyQuestionInput,
  EventSurveyOptionInput,
  EventSurveyQuestion,
  EventSurveyQuestionType,
} from "@/lib/types";
import { buildI18nPayload, type I18nLocaleMap } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LocaleTextFields, getLocaleField, setLocaleField } from "./locale-text-fields";

const inputClass =
  "mt-1 w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60";

const TYPE_OPTIONS: { value: EventSurveyQuestionType; label: string }[] = [
  { value: "rating", label: "Rating 1–5" },
  { value: "single", label: "Single choice" },
  { value: "yesno", label: "Yes / No" },
  { value: "text", label: "Free text" },
];

type OptionForm = {
  key: string;
  id?: string;
  label: string;
  i18n: I18nLocaleMap;
};

type FormState = {
  prompt: string;
  i18n: I18nLocaleMap;
  questionType: EventSurveyQuestionType;
  required: boolean;
  options: OptionForm[];
};

function emptyOption(): OptionForm {
  return { key: `o-${Math.random().toString(36).slice(2, 9)}`, label: "", i18n: {} };
}

function fromQuestion(q?: EventSurveyQuestion): FormState {
  if (!q) {
    return {
      prompt: "",
      i18n: {},
      questionType: "rating",
      required: true,
      options: [emptyOption(), emptyOption()],
    };
  }
  return {
    prompt: q.prompt,
    i18n: q.i18n ?? {},
    questionType: q.questionType,
    required: q.required,
    options:
      q.questionType === "single" && q.options.length > 0
        ? q.options.map((opt) => ({
            key: opt.id,
            id: opt.id,
            label: opt.label,
            i18n: opt.i18n ?? {},
          }))
        : [emptyOption(), emptyOption()],
  };
}

type Props = {
  open: boolean;
  initial?: EventSurveyQuestion;
  title: string;
  submitLabel: string;
  lockType?: boolean;
  onClose: () => void;
  onSubmit: (input: CreateEventSurveyQuestionInput) => Promise<{ ok: boolean; error?: string }>;
};

export function SurveyQuestionForm({
  open,
  initial,
  title,
  submitLabel,
  lockType = false,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(() => fromQuestion(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(fromQuestion(initial));
    setError(null);
  }, [open, initial]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prompt.trim()) {
      setError("Question text is required.");
      return;
    }
    let options: EventSurveyOptionInput[] | undefined;
    if (form.questionType === "single") {
      options = form.options
        .map((opt) => ({
          id: opt.id,
          label: opt.label.trim(),
          i18n: buildI18nPayload({ th: opt.i18n.th, ru: opt.i18n.ru }),
        }))
        .filter((opt) => opt.label);
      if (options.length < 2) {
        setError("Single-choice questions need at least 2 options.");
        return;
      }
    }

    setSaving(true);
    setError(null);
    const res = await onSubmit({
      prompt: form.prompt.trim(),
      questionType: form.questionType,
      required: form.required,
      options,
      i18n: buildI18nPayload({ th: form.i18n.th, ru: form.i18n.ru }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save question.");
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/50 backdrop-blur-sm"
      onClick={() => {
        if (!saving) onClose();
      }}
      role="presentation"
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-cream-300 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="px-6 py-5 border-b border-cream-200">
          <h3 className="text-forest font-semibold text-lg">{title}</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
              Question (English) *
            </span>
            <input
              required
              value={form.prompt}
              disabled={saving}
              onChange={(e) => setForm((prev) => ({ ...prev, prompt: e.target.value }))}
              className={inputClass}
            />
          </label>
          <LocaleTextFields
            label="Question"
            valueTh={getLocaleField(form.i18n, "th", "prompt")}
            valueRu={getLocaleField(form.i18n, "ru", "prompt")}
            onChangeTh={(v) =>
              setForm((prev) => ({ ...prev, i18n: setLocaleField(prev.i18n, "th", "prompt", v) }))
            }
            onChangeRu={(v) =>
              setForm((prev) => ({ ...prev, i18n: setLocaleField(prev.i18n, "ru", "prompt", v) }))
            }
            disabled={saving}
          />

          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
              Type *
            </span>
            <select
              value={form.questionType}
              disabled={saving || lockType}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  questionType: e.target.value as EventSurveyQuestionType,
                }))
              }
              className={inputClass}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {lockType && (
              <p className="text-[11px] text-ink-muted mt-1">
                Type is locked because this question already has answers.
              </p>
            )}
          </label>

          <label className="flex items-center gap-2 text-sm text-forest">
            <input
              type="checkbox"
              checked={form.required}
              disabled={saving}
              onChange={(e) => setForm((prev) => ({ ...prev, required: e.target.checked }))}
              className="rounded border-cream-300"
            />
            Required
          </label>

          {form.questionType === "single" && (
            <div className="space-y-3">
              <p className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                Options *
              </p>
              {form.options.map((opt, index) => (
                <div
                  key={opt.key}
                  className="rounded-xl border border-cream-200 bg-cream-50/40 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-ink-muted font-medium">Option {index + 1}</span>
                    {form.options.length > 2 && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            options: prev.options.filter((o) => o.key !== opt.key),
                          }))
                        }
                        className="text-[11px] text-red-700 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    value={opt.label}
                    disabled={saving}
                    placeholder="English label"
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        options: prev.options.map((o) =>
                          o.key === opt.key ? { ...o, label: e.target.value } : o
                        ),
                      }))
                    }
                    className={inputClass}
                  />
                  <LocaleTextFields
                    label="Option"
                    valueTh={getLocaleField(opt.i18n, "th", "label")}
                    valueRu={getLocaleField(opt.i18n, "ru", "label")}
                    onChangeTh={(v) =>
                      setForm((prev) => ({
                        ...prev,
                        options: prev.options.map((o) =>
                          o.key === opt.key
                            ? { ...o, i18n: setLocaleField(o.i18n, "th", "label", v) }
                            : o
                        ),
                      }))
                    }
                    onChangeRu={(v) =>
                      setForm((prev) => ({
                        ...prev,
                        options: prev.options.map((o) =>
                          o.key === opt.key
                            ? { ...o, i18n: setLocaleField(o.i18n, "ru", "label", v) }
                            : o
                        ),
                      }))
                    }
                    disabled={saving}
                  />
                </div>
              ))}
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setForm((prev) => ({ ...prev, options: [...prev.options, emptyOption()] }))
                }
                className="text-xs font-medium text-primary-dark hover:underline"
              >
                + Add option
              </button>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-cream-200 flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl border border-cream-300 px-4 py-2 text-sm text-forest hover:bg-cream-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={cn(
              "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-forest",
              saving && "opacity-60"
            )}
          >
            {saving ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
