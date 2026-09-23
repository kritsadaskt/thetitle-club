"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let settled = false;
    let timeoutId: number | undefined;
    let subscription: { unsubscribe: () => void } | undefined;

    function markReady(sessionExists: boolean) {
      if (settled) return;
      settled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      setHasSession(sessionExists);
      setChecking(false);
    }

    void (async () => {
      // Implicit / hash recovery links: #access_token=...&type=recovery
      if (window.location.hash.includes("access_token")) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          markReady(true);
          window.history.replaceState(null, "", window.location.pathname);
          return;
        }
      }

      // PKCE code landed on this page instead of /auth/callback
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          markReady(true);
          window.history.replaceState(null, "", window.location.pathname);
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        markReady(true);
        return;
      }

      // Cookies / PASSWORD_RECOVERY can arrive slightly after first paint
      timeoutId = window.setTimeout(() => {
        void supabase.auth.getSession().then(({ data }) => {
          markReady(!!data.session);
        });
      }, 2500);

      const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || nextSession) {
          markReady(!!nextSession);
        }
      });
      subscription = data.subscription;
    })();

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }
    await supabase.auth.signOut();
    router.push("/login?reset=success");
    router.refresh();
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

          {checking ? (
            <div className="flex justify-center py-16">
              <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : !hasSession ? (
            <>
              <h2 className="text-3xl font-light text-forest mb-2">Link expired</h2>
              <p className="text-ink-light text-sm mb-8 leading-relaxed">
                This reset link is invalid or has expired. Request a new one to set a new password.
              </p>
              <Link
                href="/forgot-password"
                className="btn-primary rounded-lg font-semibold w-full flex items-center justify-center gap-2 py-3.5"
              >
                Request a new link
              </Link>
              <Link
                href="/login"
                className="mt-4 block text-center text-ink-muted text-sm hover:text-ink-light transition-colors"
              >
                Back to Sign In
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-light text-forest mb-2">Set a new password</h2>
              <p className="text-ink-light text-sm mb-8">
                Choose a new password for your membership account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label-text" htmlFor="new-password">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPw ? "text" : "password"}
                      className="input-field pr-12"
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-light"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label-text" htmlFor="confirm-password">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showPw2 ? "text" : "password"}
                      className="input-field pr-12"
                      autoComplete="new-password"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw2((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-light"
                      aria-label={showPw2 ? "Hide password" : "Show password"}
                    >
                      {showPw2 ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
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
                  {loading ? "Updating..." : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
