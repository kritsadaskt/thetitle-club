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
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-forest-900 relative overflow-hidden p-12">
        {/* bg textures */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_60%,#163B2B_0%,#0A1F14_70%)]" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gold/6 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "linear-gradient(#C9A96E 1px,transparent 1px),linear-gradient(90deg,#C9A96E 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

        <div className="relative">
          <p className="section-eyebrow text-gold">The Title Residence</p>
          <p className="text-white font-semibold tracking-[3px] text-lg mt-0.5">CLUB</p>
        </div>

        <div className="relative">
          <div className="w-10 h-0.5 bg-gold mb-8 opacity-60" />
          <blockquote className="text-4xl font-light text-white leading-[1.2]">
            &ldquo;Discover,<br />
            <span className="text-gold-gradient font-semibold">&nbsp;Our Community.&rdquo;</span>
          </blockquote>
          <p className="text-white/35 mt-6 text-sm leading-relaxed max-w-sm">
            At THE TITLE, we believe that owning a home is more than holding a title — it is becoming part of a family. THE TITLE CLUB is our exclusive community designed to bring residents together through curated experiences, lifestyle privileges, and meaningful connections. Because here, every title belongs to a family.
          </p>
        </div>

        <p className="relative text-white/15 text-xs">thetitleresidence.com/club</p>
      </div>

      {/* ── Right panel: Cream ── */}
      <div className="flex-1 flex items-center justify-center bg-cream-100 px-8 py-16">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="text-center mb-10 lg:hidden">
            <p className="section-eyebrow text-gold-dark">The Title</p>
            <p className="text-forest font-semibold tracking-[3px] text-xl mt-0.5">CLUB</p>
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
              className="btn-gold w-full flex items-center justify-center gap-2 py-3.5">
              {loading
                ? <span className="w-4 h-4 border-2 border-forest/30 border-t-forest rounded-full animate-spin" />
                : <ArrowRight size={16} />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-ink-muted text-sm">
              Not a member?{" "}
              <Link href="/register" className="text-gold-dark font-medium hover:text-gold transition-colors">
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
