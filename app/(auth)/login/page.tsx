"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      router.push(result.redirectTo ?? "/dashboard");
    } else {
      setError(result.error ?? "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: Midnight Green ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-deep-blue relative overflow-hidden p-12" style={{ backgroundImage: "url('/club/club-bg.webp')" }}>

      <div className="flex flex-col justify-between gap-10">
        <div className="relative">
          <img src="/club/title-club-logo_mockup-white.webp" alt="The Title" className="w-32 h-auto object-contain" />
        </div>

        <div className="relative">
          <div className="w-10 h-0.5 bg-primary mb-8 opacity-60" />
          <blockquote className="text-4xl font-light text-white leading-[1.2]">
            &ldquo;Discover,<br />
            <span className="text-primary-gradient font-semibold">&nbsp;Our Community.&rdquo;</span>
          </blockquote>
          <p className="text-white mt-6 text-sm leading-relaxed max-w-sm">
            At THE TITLE, we believe that owning a home is more than holding a title — it is becoming part of a family. THE TITLE CLUB is our exclusive community designed to bring residents together through curated experiences, lifestyle privileges, and meaningful connections. Because here, every title belongs to a family.
          </p>
        </div>
      </div>

        <p className="relative text-white text-xs">thetitleresidence.com/club</p>
      </div>

      {/* ── Right panel: Cream ── */}
      <div className="flex-1 flex items-center justify-center bg-cream-100 px-8 py-16">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="text-center mb-10 lg:hidden">
            <img src="/club/title-club-logo_mockup-dark.webp" alt="The Title" className="w-32 h-auto object-contain mx-auto" />
          </div>

          <h2 className="text-3xl font-light text-forest mb-2">Welcome back</h2>
          <p className="text-ink-light text-sm mb-8">Sign in to your membership account</p>

          {/* Demo hint */}
          <div className="bg-forest-50 border border-forest-100 rounded-xl p-3.5 mb-7 text-xs text-forest-600">
            <strong className="text-forest-700">Demo — </strong>
            somchai@example.com / password123 &nbsp;·&nbsp; admin@thetitleresidence.com / admin123
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-text">Email Address</label>
              <input type="email" className="input-field" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <label className="label-text">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} className="input-field pr-12"
                  placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw((v) => !v)}
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
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-ink-muted text-sm">
              Not a member?{" "}
              <Link href="/register" className="text-primary-dark font-medium hover:text-primary transition-colors">
                Register here
              </Link>
            </p>
            <Link href="/" className="block text-ink-muted text-xs hover:text-ink-light transition-colors">
              ← Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
