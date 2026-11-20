"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { absoluteAppUrl } from "@/lib/app-url";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const tNav = useTranslations("nav");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: absoluteAppUrl("/auth/callback?next=/reset-password") }
    );
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] bg-deep-blue relative overflow-hidden p-12"
        style={{ backgroundImage: "url('/club/club-bg.webp')" }}
      >
        <div className="flex flex-col justify-between gap-10">
          <div className="relative">
            <img
              src={process.env.NEXT_PUBLIC_LOGO_IMAGE_URL_WHITE}
              alt={tNav("logoAlt")}
              className="w-32 h-auto object-contain"
            />
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

      <div className="flex-1 flex items-center justify-center bg-cream-100 px-8 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-10 lg:hidden">
            <img
              src="/club/title-club-logo_mockup-dark.webp"
              alt={tNav("logoAlt")}
              className="w-32 h-auto object-contain mx-auto"
            />
          </div>

          {sent ? (
            <>
              <div className="w-16 h-16 rounded-full bg-forest-50 border-2 border-forest-100 flex items-center justify-center mb-6">
                <CheckCircle className="w-8 h-8 text-forest-700" strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl font-light text-forest mb-2">{t("forgot.sent.title")}</h2>
              <p className="text-ink-light text-sm mb-8 leading-relaxed">
                {t("forgot.sent.messageBefore")} <strong className="text-ink">{email.trim()}</strong>, {t("forgot.sent.messageAfter")}
              </p>
              <Link
                href="/login"
                className="btn-primary rounded-lg font-semibold w-full flex items-center justify-center gap-2 py-3.5"
              >
                {t("forgot.sent.backToSignIn")}
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-light text-forest mb-2">{t("forgot.title")}</h2>
              <p className="text-ink-light text-sm mb-8">
                {t("forgot.subtitle")}
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label-text" htmlFor="forgot-email">
                    {t("forgot.emailLabel")}
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="input-field"
                    placeholder={t("forgot.emailPlaceholder")}
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary rounded-lg font-semibold w-full flex items-center justify-center gap-2 py-3.5"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-forest/30 border-t-forest rounded-full animate-spin" />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                  {loading ? t("forgot.submitting") : t("forgot.submit")}
                </button>
              </form>

              <div className="mt-6 text-center space-y-3">
                <p className="text-ink-muted text-sm">
                  {t("forgot.rememberedPassword")}{" "}
                  <Link
                    href="/login"
                    className="text-primary-dark font-medium hover:text-primary transition-colors"
                  >
                    {t("forgot.signIn")}
                  </Link>
                </p>
                <Link
                  href="/"
                  className="block text-ink-muted text-xs hover:text-ink-light transition-colors"
                >
                  {t("forgot.backToHomepage")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
