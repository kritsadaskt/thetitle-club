"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import type { CommunityMoment, Privilege } from "@/lib/types";
import { fetchActivePrivileges, fetchPublishedCommunity } from "@/lib/supabase/data";
import { CreditCard, Gift, Image, ChevronRight } from "lucide-react";
import { categoryLabel, categoryColor } from "@/lib/utils";

export default function DashboardPage() {
  const { member } = useAuth();
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [community, setCommunity] = useState<CommunityMoment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [p, c] = await Promise.all([fetchActivePrivileges(), fetchPublishedCommunity()]);
      if (!cancelled) {
        setPrivileges(p);
        setCommunity(c);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const featuredPrivileges = privileges.filter((p) => p.isActive).slice(0, 3);
  const latestCommunity = community.filter((c) => c.isPublished).slice(0, 3);

  if (loading) {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto flex justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="bg-deep-blue rounded-2xl p-7 mb-8 relative overflow-hidden" style={{ backgroundImage: "url('/club/club-bg.webp')" }}>
        <div className="relative">
          <p className="text-white text-sm">Good day,</p>
          <h1 className="text-2xl font-semibold text-white mt-1">
            {member?.fullName.split(" ")[0]}{" "}
            <span className="text-primary text-lg">✦</span>
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <span className="text-[11px] bg-white/20 text-white border border-white/30 px-3 py-1 rounded-full font-mono tracking-wider">
              {member?.memberId}
            </span>
            <span className="text-white text-xs capitalize">
              {member?.residentStatus} · {member?.projectName}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          {
            href: "/card",
            icon: CreditCard,
            label: "My Membership Card",
            desc: "Show QR to redeem",
            color: "bg-forest-50 text-forest-700",
          },
          {
            href: "/privileges",
            icon: Gift,
            label: "Explore Privileges",
            desc: `${privileges.length} benefits available`,
            color: "bg-primary/10 text-primary-dark",
          },
          {
            href: "/community",
            icon: Image,
            label: "Community Moments",
            desc: "Latest events & activities",
            color: "bg-forest-50 text-forest-700",
          },
        ].map(({ href, icon: Icon, label, desc, color }) => (
          <Link
            key={href}
            href={href}
            className="group bg-white border border-cream-300 rounded-2xl p-5 flex items-start gap-4 card-hover shadow-card"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={18} strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-forest font-medium text-sm">{label}</p>
              <p className="text-ink-muted text-xs mt-0.5">{desc}</p>
            </div>
            <ChevronRight size={14} className="text-ink-muted group-hover:text-primary-dark transition-colors mt-0.5" />
          </Link>
        ))}
      </div>

      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-forest font-semibold">Featured Privileges</h2>
          <Link href="/privileges" className="text-primary-dark text-xs hover:text-primary flex items-center gap-1 font-medium">
            View all <ChevronRight size={12} />
          </Link>
        </div>
        <div className="space-y-3">
          {featuredPrivileges.map((priv) => (
            <Link
              key={priv.id}
              href={`/privileges/${priv.id}`}
              className="flex items-center gap-4 bg-white border border-cream-300 rounded-2xl p-4 card-hover group shadow-card"
            >
              <img
                src={priv.partnerLogo}
                alt={priv.partnerName}
                className="w-16 h-10 object-contain rounded-lg bg-cream-200 p-1 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-forest text-sm font-medium truncate">{priv.title}</p>
                <p className="text-ink-muted text-xs truncate">{priv.summary}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded border hidden sm:block ${categoryColor(priv.category)}`}
                >
                  {categoryLabel(priv.category)}
                </span>
                <span className="bg-primary/15 text-primary-dark text-xs font-bold px-2.5 py-1 rounded-lg border border-primary/20">
                  {priv.discountLabel}
                </span>
                <ChevronRight size={14} className="text-cream-400 group-hover:text-primary-dark transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-forest font-semibold">Community Moments</h2>
          <Link href="/community" className="text-primary-dark text-xs hover:text-primary flex items-center gap-1 font-medium">
            View all <ChevronRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {latestCommunity.map((item) => (
            <div
              key={item.id}
              className="relative aspect-video overflow-hidden rounded-2xl group shadow-card border border-cream-300"
            >
              <img
                src={item.imageUrl}
                alt={item.caption}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-900/55 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <p className="text-white text-xs font-medium">{item.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
