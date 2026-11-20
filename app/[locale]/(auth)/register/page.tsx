"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CheckCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { clientWantsTestWebhook, withDevWebhookQuery } from "@/lib/n8n";
import Select, { StylesConfig, GroupBase } from "react-select";

/* ── react-select luxury theme ── */
type Opt = { value: string; label: string };

const selectStyles: StylesConfig<Opt, false, GroupBase<Opt>> = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "#ffffff",
    borderColor: state.isFocused
      ? "rgba(201, 169, 110, 0.6)"
      : state.menuIsOpen
        ? "rgba(201, 169, 110, 0.6)"
        : "#E4D9C8",
    borderRadius: "0.75rem",
    padding: "0.125rem 0.25rem",
    boxShadow: state.isFocused
      ? "0 0 0 2px rgba(201, 169, 110, 0.15)"
      : "0 1px 2px rgba(26,46,34,0.04)",
    minHeight: "48px",
    cursor: "pointer",
    transition: "all 0.2s",
    "&:hover": {
      borderColor: "rgba(201, 169, 110, 0.6)",
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: "#7A9080",
    fontSize: "0.875rem",
  }),
  singleValue: (base) => ({
    ...base,
    color: "#1A2E22",
    fontSize: "0.875rem",
  }),
  input: (base) => ({
    ...base,
    color: "#1A2E22",
    fontSize: "0.875rem",
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#ffffff",
    border: "1px solid #E4D9C8",
    borderRadius: "0.75rem",
    boxShadow: "0 4px 20px rgba(26,46,34,0.10), 0 1px 4px rgba(26,46,34,0.06)",
    overflow: "hidden",
    zIndex: 50,
  }),
  menuList: (base) => ({
    ...base,
    padding: "4px",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#0A1F14"
      : state.isFocused
        ? "rgba(201, 169, 110, 0.10)"
        : "transparent",
    color: state.isSelected ? "#FAF7F2" : "#1A2E22",
    fontSize: "0.875rem",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem",
    cursor: "pointer",
    transition: "all 0.15s",
    "&:active": {
      backgroundColor: "rgba(201, 169, 110, 0.20)",
    },
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? "#C9A96E" : "#7A9080",
    padding: "0 8px",
    transition: "all 0.2s",
    transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "rotate(0deg)",
    "&:hover": { color: "#C9A96E" },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: "#7A9080",
    "&:hover": { color: "#C9A96E" },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "2px 12px",
  }),
};

/* ── Data ── */
// Project names are proper nouns (stored values); only "Other" is translated.
const PROJECT_NAMES = [
  "THE Title WEST WING rawai",
  "THE TITLE V rawai",
  "THE TITLE Residencies nai-yang",
  "THE TITLE HALO 1 nai-yang",
  "THE TITLE Legendary Bang-Tao",
  "THE TITLE Serenity nai-yang",
] as const;

const NATIONALITY_VALUES = [
  "Thai",
  "British",
  "American",
  "German",
  "Australian",
  "Chinese",
  "Russian",
  "French",
  "Scandinavian",
  "Other",
] as const;

const GENDER_VALUES = ["male", "female", "other"] as const;
const RESIDENT_VALUES = ["owner", "tenant"] as const;

type AccountType = "residence" | "agent" | "staff";

const ACCOUNT_TYPE_VALUES: AccountType[] = ["residence", "agent", "staff"];

const ACCOUNT_PROJECT_NAME: Record<Exclude<AccountType, "residence">, string> = {
  agent: "AGENT",
  staff: "The Title Staff",
};

function Field({
  label,
  children,
  error,
  id,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  id?: string;
}) {
  return (
    <div id={id ? `field-${id}` : undefined}>
      <label className="label-text" htmlFor={id}>{label}</label>
      {children}
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}

const FIELD_ORDER = [
  "fullName",
  "gender",
  "nationality",
  "email",
  "password",
  "confirmPassword",
  "phone",
  "whatsapp",
  "residentStatus",
  "projectName",
  "houseNumber",
  "consent",
] as const;

function focusFirstInvalidField(errs: Record<string, string>) {
  const first = FIELD_ORDER.find((key) => errs[key]);
  if (!first) return;

  const wrapper = document.getElementById(`field-${first}`);
  wrapper?.scrollIntoView({ behavior: "smooth", block: "center" });

  window.setTimeout(() => {
    const control =
      document.getElementById(first) ??
      wrapper?.querySelector<HTMLElement>("input, textarea, select, [tabindex]");
    control?.focus({ preventScroll: true });
  }, 300);
}

/* ── Component ── */
export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [form, setForm] = useState({
    fullName: "", gender: "", nationality: "",
    email: "", password: "", confirmPassword: "", phone: "", whatsapp: "",
    accountType: "residence" as AccountType,
    residentStatus: "", projectName: "", houseNumber: "", consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  // Labels are built from t() so they update when the locale changes.
  const projectOptions = useMemo<Opt[]>(
    () => [
      ...PROJECT_NAMES.map((name) => ({ value: name, label: name })),
      { value: "Other", label: t("project.Other") },
    ],
    [t]
  );
  const nationalityOptions = useMemo<Opt[]>(
    () => NATIONALITY_VALUES.map((value) => ({ value, label: t(`nationality.${value}`) })),
    [t]
  );
  const genderOptions = useMemo<Opt[]>(
    () => GENDER_VALUES.map((value) => ({ value, label: t(`gender.${value}`) })),
    [t]
  );
  const residentOptions = useMemo<Opt[]>(
    () => RESIDENT_VALUES.map((value) => ({ value, label: t(`residentStatus.${value}`) })),
    [t]
  );
  const accountTypes = useMemo(
    () => ACCOUNT_TYPE_VALUES.map((value) => ({ value, label: t(`accountTypes.${value}`) })),
    [t]
  );

  function validate() {
    const e: Record<string, string> = {};
    if (!form.fullName.trim())        e.fullName       = t("validation.fullName");
    if (!form.gender)                  e.gender          = t("validation.gender");
    if (!form.nationality)             e.nationality     = t("validation.nationality");
    if (!form.email.includes("@"))     e.email           = t("validation.email");
    if (form.password.length < 8)      e.password        = t("validation.password");
    if (form.password !== form.confirmPassword) e.confirmPassword = t("validation.confirmPassword");
    if (!form.whatsapp.trim())         e.whatsapp        = t("validation.whatsapp");
    if (form.accountType === "residence") {
      if (!form.residentStatus)        e.residentStatus  = t("validation.residentStatus");
      if (!form.projectName)           e.projectName     = t("validation.projectName");
      if (!form.houseNumber.trim())    e.houseNumber     = t("validation.houseNumber");
    }
    if (!form.consent)                 e.consent         = t("validation.consent");
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      focusFirstInvalidField(errs);
      return;
    }
    setErrors({});
    setSubmitError("");
    setLoading(true);
    const supabase = createClient();
    const autoApprove = process.env.NEXT_PUBLIC_BYPASS_MEMBERSHIP_APPROVAL === "true";
    const isResidence = form.accountType === "residence";
    const projectName =
      form.accountType === "residence" ? form.projectName : ACCOUNT_PROJECT_NAME[form.accountType];
    const meta = {
      full_name: form.fullName.trim(),
      gender: form.gender,
      nationality: form.nationality,
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim(),
      account_type: form.accountType,
      is_agent: form.accountType === "agent",
      resident_status: isResidence ? form.residentStatus : null,
      project_name: projectName,
      house_number: isResidence ? form.houseNumber.trim() : null,
    };
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: meta },
    });
    if (error) {
      setSubmitError(error.message);
      setLoading(false);
      return;
    }
    if (!data.user) {
      setSubmitError(t("errors.registrationFailed"));
      setLoading(false);
      return;
    }
    if (!data.session) {
      setSubmitError(t("errors.confirmEmailEnabled"));
      setLoading(false);
      return;
    }
    const approvedAt = new Date().toISOString();
    const { error: upErr } = await supabase.from("profiles").update({
      full_name: meta.full_name,
      email: form.email.trim(),
      gender: meta.gender as "male" | "female" | "other",
      nationality: meta.nationality,
      phone: meta.phone || null,
      whatsapp: meta.whatsapp,
      resident_status: meta.resident_status as "owner" | "tenant" | null,
      project_name: meta.project_name,
      house_number: meta.house_number,
      status: autoApprove ? "active" : "pending_approval",
      ...(autoApprove ? { approved_at: approvedAt } : {}),
    }).eq("id", data.user.id);
    if (upErr) {
      setSubmitError(upErr.message);
      setLoading(false);
      return;
    }
    if (autoApprove) {
      try {
        const welcomePath = withDevWebhookQuery(
          "/club/api/members/welcome",
          clientWantsTestWebhook()
        );
        await fetch(welcomePath, { method: "POST" });
      } catch {
        // Registration succeeded; welcome email is best-effort
      }
    }
    await supabase.auth.signOut();
    setLoading(false);
    setSubmitted(true);
  }

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  function selectAccountType(next: AccountType) {
    setForm((current) => ({ ...current, accountType: next }));
    if (next !== "residence") {
      setErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors.residentStatus;
        delete nextErrors.projectName;
        delete nextErrors.houseNumber;
        return nextErrors;
      });
    }
  }

  /* ── Success screen ── */
  if (submitted) return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-forest-50 border-2 border-forest-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-9 h-9 text-forest-700" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-light text-forest mb-3">{t("success.title")}</h2>
        <p className="text-ink-light mb-2">
          {t("success.thanks")}{" "}
          <strong className="text-ink">{form.email}</strong>
        </p>
        <p className="text-ink-light mb-2">{t("success.complete")}</p>
        <p className="text-ink-muted text-sm mb-8 leading-relaxed">{t("success.welcomeEmail")}</p>
        <Link href="/login" className="btn-primary inline-block px-8 py-4 rounded-lg">{t("success.backToSignIn")}</Link>
      </div>
    </div>
  );

  /* ── Helper: find option by value ── */
  const findOpt = (opts: Opt[], val: string) => opts.find((o) => o.value === val) ?? null;

  const stepKeys = [
    "personal",
    "contact",
    form.accountType === "residence" ? "property" : form.accountType === "agent" ? "agent" : "staff",
  ] as const;

  return (
    <div className="relative min-h-screen bg-cream-100 py-16 px-6">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher variant="light" />
      </div>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="section-eyebrow text-primary-dark hover:text-primary transition-colors">
            {t("brandEyebrow")}
          </Link>
          <h1 className="text-3xl font-light text-forest mt-2">{t("title")}</h1>
          <p className="text-ink-light text-sm mt-2">{t("subtitle")}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepKeys.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-forest-900 text-cream-100 text-[11px] flex items-center justify-center font-semibold">
                  {i + 1}
                </span>
                <span className="text-xs text-ink-light font-medium">{t(`steps.${s}`)}</span>
              </div>
              {i < 2 && <div className="w-8 h-px bg-cream-300" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-cream-300 rounded-2xl shadow-card p-8 space-y-8">

          {/* ── Section 1: Personal ── */}
          <div>
            <h3 className="text-xs tracking-[3px] uppercase font-semibold text-forest mb-5 flex items-center gap-2">
              <span className="w-5 h-px bg-primary shrink-0" />{t("sections.personal")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <Field label={t("fields.fullName")} error={errors.fullName} id="fullName">
                <input id="fullName" className="input-field" placeholder={t("fields.fullNamePlaceholder")}
                  value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
              </Field>

              <div /> {/* spacer */}

              <Field label={t("fields.gender")} error={errors.gender} id="gender">
                <Select<Opt>
                  instanceId="gender"
                  inputId="gender"
                  options={genderOptions}
                  value={findOpt(genderOptions, form.gender)}
                  onChange={(opt) => set("gender", opt?.value ?? "")}
                  placeholder={t("fields.selectPlaceholder")}
                  styles={selectStyles}
                  isSearchable={false}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label={t("fields.nationality")} error={errors.nationality} id="nationality">
                  <Select<Opt>
                    instanceId="nationality"
                    inputId="nationality"
                    options={nationalityOptions}
                    value={findOpt(nationalityOptions, form.nationality)}
                    onChange={(opt) => set("nationality", opt?.value ?? "")}
                    placeholder={t("fields.selectPlaceholder")}
                    styles={selectStyles}
                    isSearchable
                  />
                </Field>
              </div>

            </div>
          </div>

          <div className="divider" />

          {/* ── Section 2: Contact ── */}
          <div>
            <h3 className="text-xs tracking-[3px] uppercase font-semibold text-forest mb-5 flex items-center gap-2">
              <span className="w-5 h-px bg-primary shrink-0" />{t("sections.contact")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label={t("fields.email")} error={errors.email} id="email">
                  <input id="email" className="input-field" type="email" placeholder={t("fields.emailPlaceholder")}
                    value={form.email} onChange={(e) => set("email", e.target.value)} />
                </Field>
              </div>
              <Field label={t("fields.password")} error={errors.password} id="password">
                <div className="relative">
                  <input id="password" className="input-field pr-11" type={showPw ? "text" : "password"}
                    autoComplete="new-password" placeholder={t("fields.passwordPlaceholder")}
                    value={form.password} onChange={(e) => set("password", e.target.value)} />
                  <button type="button" tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-forest"
                    onClick={() => setShowPw((v) => !v)} aria-label={showPw ? t("fields.hidePassword") : t("fields.showPassword")}>
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
              <Field label={t("fields.confirmPassword")} error={errors.confirmPassword} id="confirmPassword">
                <div className="relative">
                  <input id="confirmPassword" className="input-field pr-11" type={showPw2 ? "text" : "password"}
                    autoComplete="new-password" placeholder={t("fields.confirmPasswordPlaceholder")}
                    value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} />
                  <button type="button" tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-forest"
                    onClick={() => setShowPw2((v) => !v)} aria-label={showPw2 ? t("fields.hidePassword") : t("fields.showPassword")}>
                    {showPw2 ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
              <Field label={t("fields.phone")} error={errors.phone} id="phone">
                <input id="phone" className="input-field" type="tel" placeholder={t("fields.phonePlaceholder")}
                  value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label={t("fields.whatsapp")} error={errors.whatsapp} id="whatsapp">
                <input id="whatsapp" className="input-field" type="tel" placeholder={t("fields.whatsappPlaceholder")}
                  value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="divider" />

          <div>
            <h3 className="text-xs tracking-[3px] uppercase font-semibold text-forest mb-5 flex items-center gap-2">
              <span className="w-5 h-px bg-primary shrink-0" />{t("sections.accountType")}
            </h3>
            <div role="radiogroup" aria-label={t("fields.accountTypeAria")} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {accountTypes.map((option) => {
                const selected = form.accountType === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 cursor-pointer transition-colors ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-cream-300 bg-cream-50 hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="accountType"
                      value={option.value}
                      checked={selected}
                      onChange={() => selectAccountType(option.value)}
                      className="accent-forest-700 w-4 h-4 shrink-0"
                    />
                    <span className="text-sm font-medium text-forest">{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {form.accountType === "residence" && (
            <>
              <div className="divider" />

              {/* ── Section 3: Property (residents only) ── */}
              <div>
                <h3 className="text-xs tracking-[3px] uppercase font-semibold text-forest mb-5 flex items-center gap-2">
                  <span className="w-5 h-px bg-primary shrink-0" />{t("sections.property")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={t("fields.residentStatus")} error={errors.residentStatus} id="residentStatus">
                    <Select<Opt>
                      instanceId="residentStatus"
                      inputId="residentStatus"
                      options={residentOptions}
                      value={findOpt(residentOptions, form.residentStatus)}
                      onChange={(opt) => set("residentStatus", opt?.value ?? "")}
                      placeholder={t("fields.selectPlaceholder")}
                      styles={selectStyles}
                      isSearchable={false}
                    />
                  </Field>
                  <Field label={t("fields.projectName")} error={errors.projectName} id="projectName">
                    <Select<Opt>
                      instanceId="projectName"
                      inputId="projectName"
                      options={projectOptions}
                      value={findOpt(projectOptions, form.projectName)}
                      onChange={(opt) => set("projectName", opt?.value ?? "")}
                      placeholder={t("fields.selectPlaceholder")}
                      styles={selectStyles}
                      isSearchable={false}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label={t("fields.houseNumber")} error={errors.houseNumber} id="houseNumber">
                      <input id="houseNumber" className="input-field" type="text" placeholder={t("fields.houseNumberPlaceholder")}
                        value={form.houseNumber} onChange={(e) => set("houseNumber", e.target.value)} />
                    </Field>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="divider" />

          {/* ── Consent ── */}
          <div id="field-consent">
            <label className="flex items-start gap-3 cursor-pointer">
              <input id="consent" type="checkbox" checked={form.consent}
                onChange={(e) => set("consent", e.target.checked)}
                className="mt-0.5 accent-forest-700 w-4 h-4" />
              <span className="text-sm text-ink-light leading-relaxed">
                {t("consent.before")}{" "}
                <a href="#" className="text-primary-dark underline">{t("consent.privacyPolicy")}</a>{" "}{t("consent.after")}
              </span>
            </label>
            {errors.consent && <p className="text-red-600 text-xs mt-2 ml-7">{errors.consent}</p>}
          </div>

          {submitError && (
            <p className="text-red-600 text-sm text-center">{submitError}</p>
          )}

          <button type="submit" disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base">
            {loading
              ? <span className="w-4 h-4 border-2 border-forest/30 border-t-forest rounded-full animate-spin" />
              : <ArrowRight size={16} />}
            {loading ? t("submitting") : t("submit")}
          </button>
        </form>

        <p className="text-center text-ink-muted text-sm mt-6">
          {t("alreadyMember")}{" "}
          <Link href="/login" className="text-primary-dark font-medium hover:text-primary">{t("signIn")}</Link>
        </p>
      </div>
    </div>
  );
}
