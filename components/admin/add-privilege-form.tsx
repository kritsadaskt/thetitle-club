"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fetchAllPrivilegeCategories } from "@/lib/supabase/data";
import type {
  CreatePrivilegeInput,
  Privilege,
  PrivilegeCategory,
  PrivilegeMapLocation,
} from "@/lib/types";
import { buildI18nPayload } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ActiveToggle } from "./active-toggle";
import { ImageUploadField } from "./image-upload-field";
import { LocaleTextFields, getLocaleField, setLocaleField } from "./locale-text-fields";

const EMPTY_LOCATION: PrivilegeMapLocation = { name: "", mapUrl: "" };

const EMPTY: CreatePrivilegeInput = {
  title: "",
  summary: "",
  description: "",
  terms: "",
  howToRedeem: "",
  categoryId: 0,
  discountLabel: "",
  coverImage: "",
  validFrom: new Date().toISOString().slice(0, 10),
  validUntil: "",
  isActive: true,
  sortOrder: 0,
  codeMode: "shared",
  mapLocations: [],
  i18n: {},
};

export function privilegeToFormInput(p: Privilege): CreatePrivilegeInput {
  return {
    title: p.title,
    summary: p.summary,
    description: p.description,
    terms: p.terms,
    howToRedeem: p.howToRedeem,
    categoryId: p.categoryId,
    discountLabel: p.discountLabel,
    coverImage: p.coverImage,
    validFrom: p.validFrom,
    validUntil: p.validUntil ?? "",
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    codeMode: p.codeMode,
    mapLocations: p.mapLocations?.length
      ? p.mapLocations.map((loc) => ({ ...loc }))
      : [],
    i18n: {
      ...(p.i18n?.th ? { th: { ...p.i18n.th } } : {}),
      ...(p.i18n?.ru ? { ru: { ...p.i18n.ru } } : {}),
    },
  };
}

type Props = {
  open: boolean;
  partnerName: string;
  mode?: "create" | "edit";
  initial?: CreatePrivilegeInput;
  title?: string;
  submitLabel?: string;
  hideCover?: boolean;
  hideCodeMode?: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePrivilegeInput, coverFile?: File | null) => Promise<{ ok: boolean; error?: string }>;
};

export function AddPrivilegeForm({
  open,
  partnerName,
  mode = "create",
  initial,
  title: formTitle,
  submitLabel,
  hideCover = false,
  hideCodeMode = false,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<CreatePrivilegeInput>(initial ?? EMPTY);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const coverFileRef = useRef<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<PrivilegeCategory[]>([]);

  const handleCoverFileChange = (file: File | null) => {
    coverFileRef.current = file;
    setCoverFile(file);
  };

  useEffect(() => {
    if (!open) return;
    void fetchAllPrivilegeCategories().then((rows) => {
      setCategories(rows);
      if (mode === "edit" && initial) {
        setForm(initial);
      } else {
        const defaultCategoryId = rows[0]?.id ?? 0;
        setForm({ ...EMPTY, validFrom: new Date().toISOString().slice(0, 10), categoryId: defaultCategoryId });
      }
    });
    coverFileRef.current = null;
    setCoverFile(null);
    setError(null);
  }, [open]);

  if (!open) return null;

  const set = <K extends keyof CreatePrivilegeInput>(key: K, value: CreatePrivilegeInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setTranslation = (locale: "th" | "ru", field: string, value: string) => {
    setForm((prev) => ({ ...prev, i18n: setLocaleField(prev.i18n, locale, field, value) }));
  };

  /** Props for a LocaleTextFields block bound to one i18n field key. */
  const translationProps = (field: string) => ({
    valueTh: getLocaleField(form.i18n, "th", field),
    valueRu: getLocaleField(form.i18n, "ru", field),
    onChangeTh: (v: string) => setTranslation("th", field, v),
    onChangeRu: (v: string) => setTranslation("ru", field, v),
    disabled: saving,
  });

  const locations = form.mapLocations ?? [];

  const updateLocation = (index: number, key: keyof PrivilegeMapLocation, value: string) => {
    set(
      "mapLocations",
      locations.map((loc, i) => (i === index ? { ...loc, [key]: value } : loc))
    );
  };

  const addLocation = () => {
    set("mapLocations", [...locations, { ...EMPTY_LOCATION }]);
  };

  const removeLocation = (index: number) => {
    set(
      "mapLocations",
      locations.filter((_, i) => i !== index)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Privilege title is required.");
      return;
    }
    if (!form.categoryId) {
      setError("Please select a category.");
      return;
    }
    const incomplete = (form.mapLocations ?? []).some(
      (loc) => Boolean(loc.name.trim()) !== Boolean(loc.mapUrl.trim())
    );
    if (incomplete) {
      setError("Each store location needs both a branch name and a Google Maps link.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload: CreatePrivilegeInput = {
      ...form,
      i18n: buildI18nPayload({ th: form.i18n?.th, ru: form.i18n?.ru }),
    };
    const res = await onSubmit(payload, coverFileRef.current ?? coverFile);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? (mode === "edit" ? "Could not save privilege." : "Could not create privilege."));
      return;
    }
    onClose();
  };

  const heading = formTitle ?? (mode === "edit" ? "Edit Privilege" : "Add Privilege");
  const buttonLabel = submitLabel ?? (mode === "edit" ? "Save Changes" : "Create Privilege");

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
        className="bg-white rounded-2xl border border-cream-300 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="px-6 py-5 border-b border-cream-200">
          <h3 className="text-forest font-semibold text-lg">{heading}</h3>
          <p className="text-ink-muted text-xs mt-1">Partner: {partnerName}</p>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {error && (
            <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <label className="sm:col-span-2 block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Title *</span>
            <input
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <LocaleTextFields
            className="sm:col-span-2"
            label="Title"
            {...translationProps("title")}
          />
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Discount label</span>
            <input
              value={form.discountLabel ?? ""}
              onChange={(e) => set("discountLabel", e.target.value)}
              placeholder="15% OFF"
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Category</span>
            <select
              value={form.categoryId || ""}
              onChange={(e) => set("categoryId", Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {categories.length === 0 ? (
                <option value="">No categories — add one in Admin</option>
              ) : (
                categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))
              )}
            </select>
          </label>
          <LocaleTextFields
            className="sm:col-span-2"
            label="Discount label"
            placeholder="15% OFF"
            {...translationProps("discount_label")}
          />
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
              Start date *
            </span>
            <input
              type="date"
              required
              value={form.validFrom ?? ""}
              onChange={(e) => set("validFrom", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <p className="text-[11px] text-ink-muted mt-1">Hidden from members until this date (Thailand).</p>
          </label>
          <label className="block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
              Expiry date
            </span>
            <input
              type="date"
              value={form.validUntil ?? ""}
              onChange={(e) => set("validUntil", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <p className="text-[11px] text-ink-muted mt-1">
              Optional. After this date the privilege is hidden from members. Leave blank for no end.
            </p>
          </label>
          {!hideCover && (
            <div className="sm:col-span-2">
              <ImageUploadField
                label="Cover image (thumbnail)"
                hint="JPEG, PNG, WebP, or GIF — max 1 MB"
                maxSizeBytes={1024 * 1024}
                disabled={saving}
                onFileChange={handleCoverFileChange}
              />
            </div>
          )}
          <label className="sm:col-span-2 block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Summary</span>
            <input
              value={form.summary ?? ""}
              onChange={(e) => set("summary", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <LocaleTextFields
            className="sm:col-span-2"
            label="Summary"
            {...translationProps("summary")}
          />
          <label className="sm:col-span-2 block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Description</span>
            <textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <LocaleTextFields
            className="sm:col-span-2"
            label="Description"
            multiline
            rows={3}
            {...translationProps("description")}
          />
          <label className="sm:col-span-2 block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">How to redeem</span>
            <textarea
              rows={3}
              value={form.howToRedeem ?? ""}
              onChange={(e) => set("howToRedeem", e.target.value)}
              placeholder="One step per line"
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <LocaleTextFields
            className="sm:col-span-2"
            label="How to redeem"
            multiline
            rows={3}
            placeholder="One step per line"
            {...translationProps("how_to_redeem")}
          />
          <div className="sm:col-span-2 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
                  Store locations
                </p>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Branch name + Google Maps link — shown as directions on the detail page
                </p>
              </div>
              <button
                type="button"
                onClick={addLocation}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-cream-300 px-2.5 py-1.5 text-xs font-medium text-forest hover:bg-cream-50"
              >
                <Plus size={14} />
                Add branch
              </button>
            </div>
            {locations.length === 0 ? (
              <p className="text-ink-muted text-xs rounded-xl border border-dashed border-cream-300 bg-cream-50 px-3 py-3">
                No branches yet. Add one if members should see directions.
              </p>
            ) : (
              <div className="space-y-3">
                {locations.map((loc, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-2 rounded-xl border border-cream-300 bg-cream-50 p-3"
                  >
                    <input
                      value={loc.name}
                      onChange={(e) => updateLocation(index, "name", e.target.value)}
                      placeholder="Branch name"
                      className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <input
                      type="url"
                      value={loc.mapUrl}
                      onChange={(e) => updateLocation(index, "mapUrl", e.target.value)}
                      placeholder="https://maps.google.com/..."
                      className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <button
                      type="button"
                      onClick={() => removeLocation(index)}
                      className="self-stretch sm:self-auto inline-flex items-center justify-center rounded-lg border border-cream-300 px-2.5 py-2 text-ink-muted hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                      title="Remove branch"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <label className="sm:col-span-2 block">
            <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Terms</span>
            <textarea
              rows={3}
              value={form.terms ?? ""}
              onChange={(e) => set("terms", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </label>
          <LocaleTextFields
            className="sm:col-span-2"
            label="Terms"
            multiline
            rows={3}
            {...translationProps("terms")}
          />
          {!hideCodeMode && (
            <label className="block">
              <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">Code mode</span>
              <select
                value={form.codeMode ?? "shared"}
                onChange={(e) => set("codeMode", e.target.value as CreatePrivilegeInput["codeMode"])}
                className="mt-1.5 w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="shared">Shared code</option>
                <option value="unique_pool">Unique pool</option>
              </select>
            </label>
          )}
          <ActiveToggle
            className={cn("self-end pb-2", hideCodeMode && "sm:col-span-2")}
            checked={form.isActive ?? true}
            onChange={(checked) => set("isActive", checked)}
          />
        </div>
        <div className="px-6 py-4 border-t border-cream-200 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-cream-300 px-4 py-2 text-sm text-ink-light hover:bg-cream-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={cn("btn-primary text-sm px-5 py-2", saving && "opacity-60")}
          >
            {saving ? "Saving…" : buttonLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
