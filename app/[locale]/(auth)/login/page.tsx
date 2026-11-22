"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter as useNextRouter } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { isLocaleAgnosticPath } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const t = useTranslations("auth");
  const tNav = useTranslations("nav");
  const { login } = useAuth();
  const router = useRouter();
  const nextRouter = useNextRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState<"success" | "invalid" | null>(null);
  const [nextPath, setNextPath] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reset = params.get("reset");
    if (reset === "success" || reset === "invalid") setResetStatus(reset);
    setNextPath(params.get("next"));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password, nextPath);
    setLoading(false);
    if (result.success) {
      const to = result.redirectTo ?? "/dashboard";
      // /admin lives outside [locale] — next-intl router would send /ru/admin (404)
      if (isLocaleAgnosticPath(to)) nextRouter.push(to);
      else router.push(to);
    } else {
      setError(result.error ?? t("login.loginFailed"));
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: Midnight Green ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-deep-blue relative overflow-hidden p-12" style={{ backgroundImage: "url('/club/club-bg.webp')" }}>

      <div className="flex flex-col justify-between gap-10">
        <div className="relative">
          <img src={process.env.NEXT_PUBLIC_LOGO_IMAGE_URL_WHITE} alt={tNav("logoAlt")} className="w-32 h-auto object-contain" />
        </div>

        <div className="relative">
          <div className="w-10 h-0.5 bg-primary mb-8 opacity-60" />
          <blockquote className="text-4xl font-light text-white leading-[1.2]">
            {t("brand.quoteLine1")}<br />
            <span className="text-primary-gradient font-semibold">&nbsp;{t("brand.quoteLine2")}</span>
          </blockquote>
          <p className="text-white mt-6 text-sm leading-relaxed max-w-sm">
            {t("brand.description")}
          </p>
        </div>
      </div>

        <p className="relative text-white text-xs">{t("brand.footerUrl")}</p>
      </div>

      {/* ── Right panel: Cream ── */}
      <div className="relative flex-1 flex items-center justify-center bg-cream-100 px-8 py-16">
        <div className="absolute top-6 right-6">
          <LanguageSwitcher variant="light" />
        </div>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="text-center mb-10 lg:hidden">
            <img src="/club/title-club-logo_mockup-dark.webp" alt={tNav("logoAlt")} className="w-32 h-auto object-contain mx-auto" />
          </div>

          <h2 className="text-3xl font-light text-forest mb-2">{t("login.title")}</h2>
          <p className="text-ink-light text-sm mb-8">{t("login.subtitle")}</p>

          {resetStatus === "success" && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl mb-6">
              {t("login.resetSuccess")}
            </div>
          )}
          {resetStatus === "invalid" && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-6">
              {t("login.resetInvalid")}{" "}
              <Link href="/forgot-password" className="font-medium underline underline-offset-2">
                {t("login.requestNewLink")}
              </Link>
              .
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-text">{t("login.emailLabel")}</label>
              <input type="email" className="input-field" placeholder={t("login.emailPlaceholder")}
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <label className="label-text mb-0">{t("login.passwordLabel")}</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary-dark font-medium hover:text-primary transition-colors"
                >
                  {t("login.forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <input type={showPw ? "text" : "password"} className="input-field pr-12"
                  placeholder={t("login.passwordPlaceholder")} value={password}
                  onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? t("common.hidePassword") : t("common.showPassword")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-light">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary rounded-lg font-semibold w-full flex items-center justify-center gap-2 py-3.5">
              {loading
                ? <span className="w-4 h-4 border-2 border-forest/30 border-t-forest rounded-full animate-spin" />
                : <ArrowRight size={16} />}
              {loading ? t("login.submitting") : t("login.submit")}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-ink-muted text-sm">
              {t("login.notMember")}{" "}
              <Link href="/register" className="text-primary-dark font-medium hover:text-primary transition-colors">
                {t("login.registerHere")}
              </Link>
            </p>
            <Link href="/" className="block text-ink-muted text-xs hover:text-ink-light transition-colors">
              {t("login.backToHomepage")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
