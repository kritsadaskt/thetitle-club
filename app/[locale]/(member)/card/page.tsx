"use client";

import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { localeToBcp47 } from "@/lib/i18n";
import type { AppLocale } from "@/i18n/routing";
import { QRCodeCanvas } from "qrcode.react";
import { buildMembershipCardQrValue } from "@/lib/qr";
import { Share2, Download } from "lucide-react";

export default function CardPage() {
  const t = useTranslations("member.card");
  const tProfile = useTranslations("member.profile");
  const locale = useLocale() as AppLocale;
  const { member } = useAuth();
  if (!member) return null;

  const qrValue = buildMembershipCardQrValue(member.qrToken, member.memberId);
  const joinedDate = member.approvedAt ? new Date(member.approvedAt).toLocaleDateString(localeToBcp47[locale] ?? "en-US", {
    day: "numeric", month: "long", year: "numeric",
  }) : "—";

  return (
    <div className="p-6 lg:p-10 max-w-xl mx-auto">
      <h1 className="text-2xl font-light text-forest mb-1">{t("title")}</h1>
      <p className="text-ink-muted text-sm mb-8">
        {t("subtitle")}
      </p>

      {/* ── Digital Card (Midnight Green) ── */}
      <div className="relative rounded-2xl overflow-hidden bg-deep-blue border border-white/30 p-7 mb-6 shadow-xl" style={{ backgroundImage: "url('/club/club-bg.webp')" }}>
        {/* Header */}
        <div className="relative flex justify-between items-start mb-8">
          <div>
            <p className="section-eyebrow text-primary/70 text-[9px]">{t("brandEyebrow")}</p>
            <p className="text-white font-semibold tracking-[3px] text-base mt-0.5">{t("brandName")}</p>
          </div>
          <div className="bg-primary/20 border border-primary/35 rounded-lg px-3 py-1.5">
            <p className="text-primary text-[11px] font-bold tracking-widest">{t("badge")}</p>
          </div>
        </div>

        {/* Member info */}
        <div className="relative mb-6">
          <p className="text-white/80 text-xs mb-1">{t("memberName")}</p>
          <p className="text-white text-2xl font-light tracking-wide">{member.fullName}</p>
          <div className="flex flex-wrap gap-5 mt-3">
            <div>
              <p className="text-white/60 text-[10px] uppercase tracking-wider">{t("status")}</p>
              <p className="text-white/65 text-xs mt-0.5">{tProfile(`residentStatus.${member.residentStatus}`)}</p>
            </div>
            <div>
              <p className="text-white/60 text-[10px] uppercase tracking-wider">{t("project")}</p>
              <p className="text-white/65 text-xs mt-0.5">{member.projectName.replace("The Title ", "")}</p>
            </div>
            <div>
              <p className="text-white/60 text-[10px] uppercase tracking-wider">{t("since")}</p>
              <p className="text-white/65 text-xs mt-0.5">{joinedDate}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex items-end justify-between border-t border-white/10 pt-5">
          <div>
            <p className="text-white/60 text-[10px] uppercase tracking-wider mb-1">{t("memberId")}</p>
            <p className="text-primary font-mono font-semibold tracking-[3px] text-sm">{member.memberId}</p>
          </div>
          {/* Gold bar deco */}
          <div className="flex gap-1 items-end">
            {[20, 28, 16, 24, 12].map((h, i) => (
              <div key={i} className="w-1 rounded-full bg-primary/60" style={{ height: h }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── QR Code (Cream card) ── */}
      <div className="bg-white border border-cream-300 rounded-2xl p-6 mb-6 text-center shadow-card">
        <p className="section-eyebrow text-ink-muted text-[10px] mb-5">{t("scanToVerify")}</p>
        <div className="inline-block bg-cream-100 border border-cream-300 p-4 rounded-2xl mb-4 shadow-sm">
          {qrValue ? (
            <QRCodeCanvas
              value={qrValue}
              size={256}
              level="M"
              includeMargin
              fgColor="#0A1F14"
              bgColor="#FAF7F2"
              className="mx-auto h-[180px] w-[180px]"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <p className="text-ink-muted text-sm py-6">{t("qrUnavailable")}</p>
          )}
        </div>
        <p className="text-ink-muted text-xs font-mono">{member.qrToken}</p>
        <p className="text-ink-muted text-[11px] mt-1.5 max-w-xs mx-auto">
          {t("presentQr")}
        </p>
      </div>

      {/* ── Actions ── */}
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-ghost-light flex items-center justify-center gap-2 text-sm py-3">
          <Share2 size={14} /> {t("shareCard")}
        </button>
        <button className="btn-ghost-light flex items-center justify-center gap-2 text-sm py-3">
          <Download size={14} /> {t("saveToPhotos")}
        </button>
      </div>

      <p className="text-ink-muted text-xs text-center mt-6">
        {t("disclaimer")}
      </p>
    </div>
  );
}
