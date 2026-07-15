"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { LayoutDashboard, CreditCard, Gift, Image, User, LogOut, Menu, X, ArrowLeft, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/card",       label: "My Card",     icon: CreditCard },
  { href: "/privileges", label: "Privileges",  icon: Gift },
  { href: "/my-codes",   label: "My Codes",    icon: Tag },
  { href: "/community",  label: "Community",   icon: Image },
  { href: "/profile",    label: "Profile",     icon: User },
];

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const { member, isLoading, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !member) router.replace("/login");
  }, [member, isLoading, router]);

  if (isLoading || !member) return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-100 flex">

      {/* ── SIDEBAR desktop (Midnight Green) ── */}
      <aside className="hidden lg:flex flex-col w-60 bg-deep-blue fixed inset-y-0 left-0 z-30" style={{ backgroundImage: "url('/club/club-bg.webp')" }}>
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/8">
          <Link href="/">
            <img src="/club/title-club-logo_mockup-white.webp" alt="The Title" className="w-24 h-auto object-contain mx-auto" />
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                  active
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-white/80 hover:text-white/75 hover:bg-white/6"
                )}>
                <Icon size={15} strokeWidth={active ? 2 : 1.5} />
                {label}
              </Link>
            );
          })}
          <hr className="my-2 border-white/20" />
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-white/80 hover:text-white/75 hover:bg-white/6">
            <ArrowLeft size={15} /> Back to Club
          </Link>
        </nav>

        {/* User footer */}
        <div className="px-4 py-5 border-t border-white/8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold">
              {member.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-base font-medium truncate">{member.fullName}</p>
              <p className="text-white text-sm font-mono truncate">{member.memberId}</p>
            </div>
          </div>
          <button onClick={logout}
            className="flex items-center gap-2 text-white/60 hover:text-red-400 text-sm transition-colors">
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── MOBILE HEADER (Midnight Green) ── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 bg-forest-900/95 backdrop-blur border-b border-white/8 h-14 flex items-center px-5 justify-between">
        <div>
          <p className="section-eyebrow text-primary/80 text-[9px]">The Title</p>
          <p className="text-white font-semibold tracking-[3px] text-xs">CLUB</p>
        </div>
        <button onClick={() => setMobileOpen((v) => !v)} className="text-white/50 hover:text-white">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-20 bg-forest-950/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}>
          <div className="w-56 h-full bg-forest-900 border-r border-white/8 flex flex-col pt-14"
            onClick={(e) => e.stopPropagation()}>
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                    pathname === href ? "bg-primary/15 text-primary" : "text-white/45 hover:text-white/75"
                  )}>
                  <Icon size={15} />{label}
                </Link>
              ))}
            </nav>
            <div className="px-4 py-4 border-t border-white/8">
              <button onClick={logout} className="flex items-center gap-2 text-white/25 text-xs hover:text-red-400">
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT (Cream) ── */}
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
