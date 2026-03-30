"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, ArrowRight } from "lucide-react";

const PROJECTS = [
  "The Title Rawai Phase 3", "The Title Rawai Phase 4",
  "The Title Serenity Bangtao", "The Title Signature", "Other",
];
const NATIONALITIES = [
  "Thai", "British", "American", "German", "Australian",
  "Chinese", "Russian", "French", "Scandinavian", "Other",
];

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [form, setForm] = useState({
    fullName: "", gender: "", age: "", nationality: "",
    email: "", phone: "", whatsapp: "",
    residentStatus: "", projectName: "", consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.fullName.trim())        e.fullName       = "Full name is required";
    if (!form.gender)                  e.gender          = "Please select gender";
    if (!form.age || +form.age < 18)   e.age             = "Must be 18 or older";
    if (!form.nationality)             e.nationality     = "Please select nationality";
    if (!form.email.includes("@"))     e.email           = "Valid email required";
    if (!form.phone.trim())            e.phone           = "Phone number required";
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
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
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
        <Link href="/login" className="btn-gold inline-block px-8">Back to Sign In</Link>
      </div>
    </div>
  );

  /* ── Field helpers ── */
  const Field = ({ k, label, children }: { k: string; label: string; children: React.ReactNode }) => (
    <div>
      <label className="label-text">{label}</label>
      {children}
      {errors[k] && <p className="text-red-600 text-xs mt-1">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-100 py-16 px-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="section-eyebrow text-gold-dark hover:text-gold transition-colors">
            The Title CLUB
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
              <span className="w-5 h-px bg-gold flex-shrink-0" />Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field k="fullName" label="Full Name *">
                <input className="input-field" placeholder="e.g. John Smith"
                  value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
              </Field>
              <div /> {/* spacer */}
              <Field k="gender" label="Gender *">
                <select className="input-field" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Prefer not to say</option>
                </select>
              </Field>
              <Field k="age" label="Age *">
                <input className="input-field" type="number" min="18" max="120" placeholder="e.g. 35"
                  value={form.age} onChange={(e) => set("age", e.target.value)} />
              </Field>
              <Field k="nationality" label="Nationality *">
                <select className="input-field sm:col-span-2" value={form.nationality} onChange={(e) => set("nationality", e.target.value)}>
                  <option value="">Select...</option>
                  {NATIONALITIES.map((n) => <option key={n}>{n}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <div className="divider" />

          {/* ── Section 2: Contact ── */}
          <div>
            <h3 className="text-xs tracking-[3px] uppercase font-semibold text-forest mb-5 flex items-center gap-2">
              <span className="w-5 h-px bg-gold flex-shrink-0" />Contact Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field k="email" label="Email Address *">
                  <input className="input-field" type="email" placeholder="you@example.com"
                    value={form.email} onChange={(e) => set("email", e.target.value)} />
                </Field>
              </div>
              <Field k="phone" label="Phone Number *">
                <input className="input-field" type="tel" placeholder="+66 8x xxx xxxx"
                  value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field k="whatsapp" label="WhatsApp Number">
                <input className="input-field" type="tel" placeholder="Same as above?"
                  value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="divider" />

          {/* ── Section 3: Property ── */}
          <div>
            <h3 className="text-xs tracking-[3px] uppercase font-semibold text-forest mb-5 flex items-center gap-2">
              <span className="w-5 h-px bg-gold flex-shrink-0" />Property Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field k="residentStatus" label="Resident Status *">
                <select className="input-field" value={form.residentStatus} onChange={(e) => set("residentStatus", e.target.value)}>
                  <option value="">Select...</option>
                  <option value="owner">Owner</option>
                  <option value="tenant">Tenant (Long-term)</option>
                </select>
              </Field>
              <Field k="projectName" label="Project / Property *">
                <select className="input-field" value={form.projectName} onChange={(e) => set("projectName", e.target.value)}>
                  <option value="">Select...</option>
                  {PROJECTS.map((p) => <option key={p}>{p}</option>)}
                </select>
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
                <a href="#" className="text-gold-dark underline">Privacy Policy</a>{" "}(PDPA) and confirm that all information provided is accurate.
              </span>
            </label>
            {errors.consent && <p className="text-red-600 text-xs mt-2 ml-7">{errors.consent}</p>}
          </div>

          <button type="submit" disabled={loading}
            className="btn-gold w-full flex items-center justify-center gap-2 py-4 text-base">
            {loading
              ? <span className="w-4 h-4 border-2 border-forest/30 border-t-forest rounded-full animate-spin" />
              : <ArrowRight size={16} />}
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </form>

        <p className="text-center text-ink-muted text-sm mt-6">
          Already a member?{" "}
          <Link href="/login" className="text-gold-dark font-medium hover:text-gold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
