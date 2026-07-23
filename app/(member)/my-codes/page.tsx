"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Clock, Tag, CheckCircle2 } from "lucide-react";
import { fetchMyPromoCodes } from "@/lib/supabase/data";
import { formatCountdown } from "@/lib/promo-code-import";
import type { MemberPromoCode } from "@/lib/types";
import { cn } from "@/lib/utils";

type ViewTab = "active" | "used";

function PromoCodeCard({ item }: { item: MemberPromoCode }) {
  const [countdown, setCountdown] = useState("");
  const isActive = item.status === "claimed";

  useEffect(() => {
    if (!isActive || !item.expiresAt) return;
    const tick = () => setCountdown(formatCountdown(item.expiresAt!));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isActive, item.expiresAt]);

  const content = (
    <div className="flex items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-ink-muted text-xs truncate">{item.partnerName}</p>
            <h3 className="text-forest font-medium text-sm truncate">{item.privilegeTitle}</h3>
          </div>
          <span className="bg-primary/15 text-primary-dark text-[10px] font-bold px-2 py-0.5 rounded-md border border-primary/20 shrink-0">
            {item.discountLabel}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border",
              isActive
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-emerald-50 text-emerald-800 border-emerald-200"
            )}
          >
            {isActive ? "Active" : "Used"}
          </span>
          {isActive && item.expiresAt && (
            <span className="inline-flex items-center gap-1 text-ink-muted text-xs">
              <Clock size={11} />
              <span className="font-mono">{countdown}</span>
            </span>
          )}
          {!isActive && item.redeemedAt && (
            <span className="inline-flex items-center gap-1 text-ink-muted text-xs">
              <CheckCircle2 size={11} />
              {new Date(item.redeemedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      {isActive && (
        <ChevronRight size={16} className="text-ink-muted shrink-0" />
      )}
    </div>
  );

  if (isActive) {
    return (
      <Link
        href={`/privileges/${item.privilegeId}/redeem`}
        className="block bg-white border border-cream-300 rounded-xl shadow-card hover:border-primary/40 transition-colors"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="bg-white border border-cream-300 rounded-xl shadow-card">
      {content}
    </div>
  );
}

export default function MyCodesPage() {
  const [codes, setCodes] = useState<MemberPromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ViewTab>("active");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchMyPromoCodes();
    setCodes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeCodes = codes.filter((c) => c.status === "claimed");
  const usedCodes = codes.filter((c) => c.status === "redeemed");
  const shown = tab === "active" ? activeCodes : usedCodes;

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="section-eyebrow text-primary-dark mb-1">My Privileges</p>
        <h1 className="text-3xl font-light text-forest flex items-center gap-3">
          <Tag size={24} className="text-primary-dark" strokeWidth={1.5} />
          View My Codes
        </h1>
        <p className="text-ink-muted text-sm mt-2">
          Check the status of codes you claimed. Open an active code to show it at the partner.
        </p>
      </div>

      <div className="flex gap-1 mb-6 bg-white border border-cream-300 rounded-xl p-1 w-fit shadow-sm">
        {(
          [
            { id: "active" as const, label: `Active (${activeCodes.length})` },
            { id: "used" as const, label: `Used (${usedCodes.length})` },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === id ? "bg-forest-900 text-cream-100" : "text-ink-light hover:text-forest"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : shown.length === 0 ? (
        <div className="bg-white border border-cream-300 rounded-2xl p-10 text-center shadow-card">
          <Tag size={32} className="text-ink-muted mx-auto mb-3" strokeWidth={1} />
          <p className="text-forest font-medium">
            {tab === "active" ? "No active promo codes" : "No used promo codes yet"}
          </p>
          <p className="text-ink-muted text-sm mt-2">
            {tab === "active"
              ? "Claim a code from a privilege with limited promo codes."
              : "Codes you mark as used will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {shown.map((item) => (
            <PromoCodeCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
