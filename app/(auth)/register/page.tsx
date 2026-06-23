"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
const PROJECT_OPTIONS: Opt[] = [
  { value: "THE Title WEST WING rawai",label: "THE Title WEST WING rawai" },
  { value: "THE TITLE V rawai",label: "THE TITLE V rawai" },
  { value: "THE TITLE Residencies nai-yang",label: "THE TITLE Residencies nai-yang" },
  { value: "THE TITLE HALO 1 nai-yang",label: "THE TITLE HALO 1 nai-yang" },
  { value: "THE TITLE Legendary Bang-Tao",label: "THE TITLE Legendary Bang-Tao" },
  { value: "THE TITLE Serenity nai-yang",label: "THE TITLE Serenity nai-yang" },
  { value: "Other",label: "Other" },
];

const NATIONALITY_OPTIONS: Opt[] = [
  { value: "Thai",         label: "Thai" },
  { value: "British",      label: "British" },
  { value: "American",     label: "American" },
  { value: "German",       label: "German" },
  { value: "Australian",   label: "Australian" },
  { value: "Chinese",      label: "Chinese" },
  { value: "Russian",      label: "Russian" },
  { value: "French",       label: "French" },
  { value: "Scandinavian", label: "Scandinavian" },
  { value: "Other",        label: "Other" },
];

const GENDER_OPTIONS: Opt[] = [
  { value: "male",   label: "Male" },
  { value: "female", label: "Female" },
  { value: "other",  label: "Prefer not to say" },
];

const RESIDENT_OPTIONS: Opt[] = [
  { value: "owner",  label: "Owner" },
  { value: "tenant", label: "Tenant" },
];

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className="label-text">{label}</label>
      {children}
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}

/* ── Component ── */
export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [form, setForm] = useState({
    fullName: "", gender: "", age: "", nationality: "",
    email: "", password: "", confirmPassword: "", phone: "", whatsapp: "",
    residentStatus: "", projectName: "", consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.fullName.trim())        e.fullName       = "Full name is required";
    if (!form.gender)                  e.gender          = "Please select gender";
    if (!form.age || +form.age < 18)   e.age             = "Must be 18 or older";
    if (!form.nationality)             e.nationality     = "Please select nationality";
    if (!form.email.includes("@"))     e.email           = "Valid email required";
    if (form.password.length < 8)      e.password        = "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    if (!form.phone.trim())            e.phone           = "Phone number required";
    if (!form.whatsapp.trim())         e.whatsapp        = "WhatsApp number required";
    if (!form.residentStatus)          e.residentStatus  = "Please select status";
    if (!form.projectName)             e.projectName     = "Please select project";
    if (!form.consent)                 e.consent         = "Please accept the terms";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitError("");
    setLoading(true);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const meta = {
      full_name: form.fullName.trim(),
      gender: form.gender,
      age: form.age,
      nationality: form.nationality,
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim(),
      resident_status: form.residentStatus,
      project_name: form.projectName,
    };
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${origin}/club/login`,
        data: meta,
      },
    });
    if (error) {
      setSubmitError(error.message);
      setLoading(false);
      return;
    }
    if (data.session?.user) {
      const autoApprove = process.env.NEXT_PUBLIC_BYPASS_MEMBERSHIP_APPROVAL === "true";
      const { error: upErr } = await supabase.from("profiles").update({
        full_name: meta.full_name,
        email: form.email.trim(),
        gender: meta.gender as "male" | "female" | "other",
        age: parseInt(form.age, 10),
        nationality: meta.nationality,
        phone: meta.phone,
        whatsapp: meta.whatsapp,
        resident_status: meta.resident_status as "owner" | "tenant",
        project_name: meta.project_name,
        ...(autoApprove
          ? {
              status: "active" as const,
              approved_at: new Date().toISOString(),
            }
          : {}),
      }).eq("id", data.session.user.id);
      if (upErr) {
        setSubmitError(upErr.message);
        setLoading(false);
        return;
      }
    }
    setLoading(false);
    setSubmitted(true);
  }

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  /* ── Success screen ── */
  if (submitted) return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-forest-50 border-2 border-forest-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-9 h-9 text-forest-700" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-light text-forest mb-3">Check Your Email</h2>
        <p className="text-ink-light mb-2">
          We&apos;ve sent a verification link to{" "}
          <strong className="text-ink">{form.email}</strong>
        </p>
        <p className="text-ink-muted text-sm mb-8 leading-relaxed">
          Click the link to verify your email. Our team will then review your application —
          you&apos;ll receive a welcome email once approved.
        </p>
        <Link href="/login" className="btn-primary inline-block px-8">Back to Sign In</Link>
      </div>
    </div>
  );

  /* ── Helper: find option by value ── */
  const findOpt = (opts: Opt[], val: string) => opts.find((o) => o.value === val) ?? null;

  return (
    <div className="min-h-screen bg-cream-100 py-16 px-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="section-eyebrow text-primary-dark hover:text-primary transition-colors">
            The Title
          </Link>
          <h1 className="text-3xl font-light text-forest mt-2">Become Part of the Family</h1>
          <p className="text-ink-light text-sm mt-2">Complete the form below to apply for membership</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["Personal", "Contact", "Property"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-forest-900 text-cream-100 text-[11px] flex items-center justify-center font-semibold">
                  {i + 1}
                </span>
                <span className="text-xs text-ink-light font-medium">{s}</span>
              </div>
              {i < 2 && <div className="w-8 h-px bg-cream-300" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-cream-300 rounded-2xl shadow-card p-8 space-y-8">

          {/* ── Section 1: Personal ── */}
          <div>
            <h3 className="text-xs tracking-[3px] uppercase font-semibold text-forest mb-5 flex items-center gap-2">
              <span className="w-5 h-px bg-primary flex-shrink-0" />Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <Field label="Full Name *" error={errors.fullName}>
                <input className="input-field" placeholder="e.g. John Smith"
                  value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
              </Field>

              <div /> {/* spacer */}

              <Field label="Gender *" error={errors.gender}>
                <Select<Opt>
                  instanceId="gender"
                  options={GENDER_OPTIONS}
                  value={findOpt(GENDER_OPTIONS, form.gender)}
                  onChange={(opt) => set("gender", opt?.value ?? "")}
                  placeholder="Select..."
                  styles={selectStyles}
                  isSearchable={false}
                />
              </Field>

              <Field label="Age *" error={errors.age}>
                <input className="input-field" type="number" min="18" max="120" placeholder="e.g. 35"
                  value={form.age} onChange={(e) => set("age", e.target.value)} />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Nationality *" error={errors.nationality}>
                  <Select<Opt>
                    instanceId="nationality"
                    options={NATIONALITY_OPTIONS}
                    value={findOpt(NATIONALITY_OPTIONS, form.nationality)}
                    onChange={(opt) => set("nationality", opt?.value ?? "")}
                    placeholder="Select..."
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
              <span className="w-5 h-px bg-primary flex-shrink-0" />Contact Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Email Address *" error={errors.email}>
                  <input className="input-field" type="email" placeholder="you@example.com"
                    value={form.email} onChange={(e) => set("email", e.target.value)} />
                </Field>
              </div>
              <Field label="Password *" error={errors.password}>
                <div className="relative">
                  <input className="input-field pr-11" type={showPw ? "text" : "password"}
                    autoComplete="new-password" placeholder="At least 8 characters"
                    value={form.password} onChange={(e) => set("password", e.target.value)} />
                  <button type="button" tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-forest"
                    onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"}>
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm Password *" error={errors.confirmPassword}>
                <div className="relative">
                  <input className="input-field pr-11" type={showPw2 ? "text" : "password"}
                    autoComplete="new-password" placeholder="Repeat password"
                    value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} />
                  <button type="button" tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-forest"
                    onClick={() => setShowPw2((v) => !v)} aria-label={showPw2 ? "Hide password" : "Show password"}>
                    {showPw2 ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
              <Field label="Phone Number *" error={errors.phone}>
                <input className="input-field" type="tel" placeholder="+66 8x xxx xxxx"
                  value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label="WhatsApp Number *" error={errors.whatsapp}>
                <input className="input-field" type="tel" placeholder="+7 999 xxx xx xx"
                  value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="divider" />

          {/* ── Section 3: Property ── */}
          <div>
            <h3 className="text-xs tracking-[3px] uppercase font-semibold text-forest mb-5 flex items-center gap-2">
              <span className="w-5 h-px bg-primary flex-shrink-0" />Property Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Resident Status *" error={errors.residentStatus}>
                <Select<Opt>
                  instanceId="residentStatus"
                  options={RESIDENT_OPTIONS}
                  value={findOpt(RESIDENT_OPTIONS, form.residentStatus)}
                  onChange={(opt) => set("residentStatus", opt?.value ?? "")}
                  placeholder="Select..."
                  styles={selectStyles}
                  isSearchable={false}
                />
              </Field>
              <Field label="Project / Property *" error={errors.projectName}>
                <Select<Opt>
                  instanceId="projectName"
                  options={PROJECT_OPTIONS}
                  value={findOpt(PROJECT_OPTIONS, form.projectName)}
                  onChange={(opt) => set("projectName", opt?.value ?? "")}
                  placeholder="Select..."
                  styles={selectStyles}
                  isSearchable={false}
                />
              </Field>
            </div>
          </div>

          <div className="divider" />

          {/* ── Consent ── */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={form.consent}
                onChange={(e) => set("consent", e.target.checked)}
                className="mt-0.5 accent-forest-700 w-4 h-4" />
              <span className="text-sm text-ink-light leading-relaxed">
                I consent to The Title Residence collecting and processing my personal data in accordance with the{" "}
                <a href="#" className="text-primary-dark underline">Privacy Policy</a>{" "}(PDPA) and confirm that all information provided is accurate.
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
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </form>

        <p className="text-center text-ink-muted text-sm mt-6">
          Already a member?{" "}
          <Link href="/login" className="text-primary-dark font-medium hover:text-primary">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
