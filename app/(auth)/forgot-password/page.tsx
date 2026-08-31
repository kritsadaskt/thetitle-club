"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { absoluteAppUrl } from "@/lib/app-url";

export default function ForgotPasswordPage() {
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
              src="/club/title-club-logo_mockup-white.webp"
              alt="The Title"
              className="w-32 h-auto object-contain"
            />
          </div>

          <div className="relative">
            <div className="w-10 h-0.5 bg-primary mb-8 opacity-60" />
            <blockquote className="text-4xl font-light text-white leading-[1.2]">
              &ldquo;Discover,<br />
              <span className="text-primary-gradient font-semibold">&nbsp;Our Community.&rdquo;</span>
            </blockquote>
            <p className="text-white mt-6 text-sm leading-relaxed max-w-sm">
              At THE TITLE, we believe that owning a home is more than holding a title — it is becoming part of a family. THE TITLE is our exclusive community designed to bring residents together through curated experiences, lifestyle privileges, and meaningful connections. Because here, every title belongs to a family.
            </p>
          </div>
        </div>

        <p className="relative text-white text-xs">thetitleresidence.com/club</p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-cream-100 px-8 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-10 lg:hidden">
            <img
              src="/club/title-club-logo_mockup-dark.webp"
              alt="The Title"
              className="w-32 h-auto object-contain mx-auto"
            />
          </div>

          {sent ? (
            <>
              <div className="w-16 h-16 rounded-full bg-forest-50 border-2 border-forest-100 flex items-center justify-center mb-6">
                <CheckCircle className="w-8 h-8 text-forest-700" strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl font-light text-forest mb-2">Check your email</h2>
              <p className="text-ink-light text-sm mb-8 leading-relaxed">
                If an account exists for <strong className="text-ink">{email.trim()}</strong>, you will
                receive a link to set a new password. Check your inbox and spam folder.
              </p>
              <Link
                href="/login"
                className="btn-primary rounded-lg font-semibold w-full flex items-center justify-center gap-2 py-3.5"
              >
                Back to Sign In
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-light text-forest mb-2">Forgot password</h2>
              <p className="text-ink-light text-sm mb-8">
                Enter your email and we will send you a link to set a new password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label-text" htmlFor="forgot-email">
                    Email Address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="input-field"
                    placeholder="you@example.com"
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
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>

              <div className="mt-6 text-center space-y-3">
                <p className="text-ink-muted text-sm">
                  Remembered your password?{" "}
                  <Link
                    href="/login"
                    className="text-primary-dark font-medium hover:text-primary transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
                <Link
                  href="/"
                  className="block text-ink-muted text-xs hover:text-ink-light transition-colors"
                >
                  ← Back to homepage
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
