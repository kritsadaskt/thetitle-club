"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Privilege } from "@/lib/types";
import {
  claimPromoCode,
  fetchMemberPromoCodeForPrivilege,
  fetchPrivilegeById,
  fetchPromoCodeStats,
  getSharedRedeemQuota,
  type SharedRedeemQuota,
} from "@/lib/supabase/data";
import { categoryLabel, categoryColor } from "@/lib/utils";
import { ArrowLeft, CheckCircle, Ticket, Tag, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type ClaimState = "none" | "claimed" | "redeemed" | "sold_out" | "loading";

export default function PrivilegeDetailPage() {
  const t = useTranslations("member.privilegeDetail");
  const tRedeem = useTranslations("member.redeem");
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [priv, setPriv] = useState<Privilege | null | undefined>(undefined);
  const [claimState, setClaimState] = useState<ClaimState>("loading");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [sharedQuota, setSharedQuota] = useState<SharedRedeemQuota | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const row = await fetchPrivilegeById(id, locale);
      if (cancelled) return;
      setPriv(row);
      if (!row) return;

      if (row.codeMode === "shared") {
        setClaimState("none");
        if (row.sharedRedeemLimit != null) {
          const quotaRes = await getSharedRedeemQuota(id);
          if (cancelled) return;
          if (quotaRes.ok) setSharedQuota(quotaRes.quota);
        } else {
          setSharedQuota(null);
        }
        return;
      }

      setSharedQuota(null);
      const [memberCode, stats] = await Promise.all([
        fetchMemberPromoCodeForPrivilege(id, locale),
        fetchPromoCodeStats(id),
      ]);
      if (cancelled) return;

      if (memberCode?.status === "redeemed") {
        setClaimState("redeemed");
      } else if (memberCode?.status === "claimed") {
        setClaimState("claimed");
      } else if (stats.available > 0) {
        setClaimState("none");
      } else {
        setClaimState("sold_out");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, locale]);

  const handleClaim = async () => {
    if (!priv) return;
    setClaiming(true);
    setClaimError(null);
    const res = await claimPromoCode(priv.id);
    setClaiming(false);
    if (!res.ok) {
      setClaimError(res.error);
      return;
    }
    setClaimState("claimed");
    router.push(`/privileges/${priv.id}/redeem`);
  };

  if (priv === undefined) {
    return (
      <div className="p-6 lg:p-10 max-w-3xl mx-auto flex justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!priv) return notFound();

  const isUniquePool = priv.codeMode === "unique_pool";

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <Link
        href="/privileges"
        className="inline-flex items-center gap-2 text-ink-muted hover:text-forest text-sm mb-6 transition-colors font-medium"
      >
        <ArrowLeft size={14} /> {t("backToPrivileges")}
      </Link>

      <div className="relative h-56 md:h-72 rounded-2xl overflow-hidden mb-6 shadow-card">
        {priv.coverImage ? (
          <img src={priv.coverImage} alt={priv.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-cream-300" aria-hidden />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-forest-900/70 to-transparent" />
        <span className="absolute top-4 right-4 bg-primary text-forest-900 font-bold px-4 py-1.5 rounded-full shadow-primary-sm">
          {priv.discountLabel}
        </span>
        <span
          className={`absolute bottom-4 left-4 text-xs px-2 py-1 rounded border ${categoryColor(priv.category)}`}
        >
          {categoryLabel(priv.category)}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-6">
        {priv.partnerLogo ? (
          <img
            src={priv.partnerLogo}
            alt={priv.partnerName}
            className="w-20 h-12 object-contain bg-cream-200 border border-cream-300 rounded-xl p-2"
          />
        ) : (
          <div className="w-20 h-12 bg-cream-200 border border-cream-300 rounded-xl" aria-hidden />
        )}
        <div>
          <p className="text-ink-muted text-xs">{priv.partnerName}</p>
          <h1 className="text-2xl font-light text-forest">{priv.title}</h1>
        </div>
      </div>

      {isUniquePool && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 mb-6 text-sm text-sky-800">
          {t("uniquePoolNotice")}
        </div>
      )}

      {priv.validUntil && (
        <div className="bg-primary/10 border border-primary/25 rounded-xl px-4 py-3 mb-6 text-sm text-primary-dark flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
          {t.rich("validUntil", {
            date: priv.validUntil,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </div>
      )}

      <section className="mb-7">
        <h2 className="text-forest font-semibold mb-3">{t("aboutTitle")}</h2>
        <p className="text-ink-light leading-relaxed whitespace-pre-line">{priv.description}</p>
      </section>

      {priv.howToRedeem && (
      <section className="mb-7 bg-forest-50 border border-forest-100 rounded-2xl p-5">
        <h2 className="text-forest font-semibold mb-4 flex items-center gap-2">
          <Ticket size={15} className="text-primary-dark" />
          {t("howToRedeem")}
        </h2>
        <div className="space-y-3">
          {(priv.howToRedeem || "").split("\n").map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-ink-light">
              <CheckCircle size={14} className="text-forest-500 shrink-0 mt-0.5" strokeWidth={2} />
              {step.replace(/^\d+\.\s*/, "")}
            </div>
            ))}
          </div>
        </section>
      )}

      {priv.terms && (
      <section className="mb-10">
        <h2 className="text-forest font-semibold mb-3">{t("termsTitle")}</h2>
        <div className="space-y-2">
          {(priv.terms || "").split("\n").map((t, i) => (
            <p key={i} className="text-ink-muted text-sm">
              {t}
            </p>
          ))}
          </div>
        </section>
      )}

      {priv.mapLocations.length > 0 && (
        <section className="mb-8">
          <h2 className="text-forest font-semibold mb-3 flex items-center gap-2">
            <MapPin size={15} className="text-primary-dark" />
            {t("storeLocations")}
          </h2>
          <div className="space-y-2">
            {priv.mapLocations.map((loc, i) => (
              <a
                key={`${loc.name}-${i}`}
                href={loc.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-forest/15 bg-white px-4 py-3 text-forest shadow-card hover:bg-forest-50 transition-colors"
              >
                <span className="font-medium text-sm min-w-0 truncate">{loc.name}</span>
                <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-dark">
                  <MapPin size={14} />
                  {t("directions")}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="sticky bottom-6 space-y-3">
        {!isUniquePool ? (
          <>
            {priv.sharedRedeemLimit != null && priv.sharedRedeemPeriod && (
              <p className="text-center text-xs text-ink-muted">
                {sharedQuota
                  ? sharedQuota.allowed
                    ? t("sharedQuotaStatus", {
                        used: sharedQuota.used,
                        limit: sharedQuota.limit ?? priv.sharedRedeemLimit,
                        period: tRedeem(`period.${priv.sharedRedeemPeriod}`),
                      })
                    : t("sharedQuotaExhausted", {
                        period: tRedeem(`period.${priv.sharedRedeemPeriod}`),
                      })
                  : t("sharedLimitHint", {
                      limit: priv.sharedRedeemLimit,
                      period: tRedeem(`period.${priv.sharedRedeemPeriod}`),
                    })}
              </p>
            )}
            {sharedQuota && !sharedQuota.allowed ? (
              <button
                type="button"
                disabled
                className={cn(
                  "w-full text-center text-base flex items-center justify-center gap-2 py-4 rounded-xl",
                  "bg-cream-200 text-ink-muted border border-cream-300 cursor-not-allowed"
                )}
              >
                <CheckCircle size={18} />
                {t("sharedQuotaExhausted", {
                  period: tRedeem(`period.${priv.sharedRedeemPeriod ?? "month"}`),
                })}
              </button>
            ) : (
              <Link
                href={`/privileges/${priv.id}/redeem`}
                className="btn-primary w-full text-center text-base flex items-center justify-center gap-2 py-4 shadow-primary-md"
              >
                <Ticket size={18} />
                {t("usePrivilege")}
              </Link>
            )}
          </>
        ) : claimState === "loading" ? (
          <div className="btn-primary w-full text-center text-base flex items-center justify-center gap-2 py-4 opacity-70">
            <Loader2 size={18} className="animate-spin" />
            {t("loading")}
          </div>
        ) : claimState === "claimed" ? (
          <Link
            href={`/privileges/${priv.id}/redeem`}
            className="btn-primary w-full text-center text-base flex items-center justify-center gap-2 py-4 shadow-primary-md"
          >
            <Ticket size={18} />
            {t("usePrivilege")}
          </Link>
        ) : claimState === "redeemed" ? (
          <button
            type="button"
            disabled
            className={cn(
              "w-full text-center text-base flex items-center justify-center gap-2 py-4 rounded-xl",
              "bg-cream-200 text-ink-muted border border-cream-300 cursor-not-allowed"
            )}
          >
            <CheckCircle size={18} />
            {t("privilegeUsed")}
          </button>
        ) : claimState === "sold_out" ? (
          <button
            type="button"
            disabled
            className={cn(
              "w-full text-center text-base flex items-center justify-center gap-2 py-4 rounded-xl",
              "bg-cream-200 text-ink-muted border border-cream-300 cursor-not-allowed"
            )}
          >
            {t("noCodesAvailable")}
          </button>
        ) : (
          <>
            {claimError && (
              <p className="text-red-600 text-sm text-center mb-3">{claimError}</p>
            )}
            <button
              type="button"
              disabled={claiming}
              onClick={() => void handleClaim()}
              className="btn-primary w-full text-center text-base flex items-center justify-center gap-2 py-4 shadow-primary-md disabled:opacity-60"
            >
              {claiming ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> {t("claiming")}
                </>
              ) : (
                <>
                  <Tag size={18} />
                  {t("claimPrivilege")}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
