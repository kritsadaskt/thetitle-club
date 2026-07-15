"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Clock, QrCode, Tag, Type, CheckCircle2 } from "lucide-react";
import { fetchMyPromoCodes, redeemPromoCode } from "@/lib/supabase/data";
import { formatCountdown } from "@/lib/promo-code-import";
import { buildRedeemQrValue } from "@/lib/qr";
import type { MemberPromoCode } from "@/lib/types";
import { cn } from "@/lib/utils";

type DisplayMode = "qr" | "text";
type ViewTab = "active" | "used";

function PromoCodeCard({
  item,
  onRedeemed,
}: {
  item: MemberPromoCode;
  onRedeemed: (id: string) => void;
}) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("qr");
  const [countdown, setCountdown] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = item.status === "claimed";
  const qrValue = buildRedeemQrValue(item.code);

  useEffect(() => {
    if (!isActive || !item.expiresAt) return;
    const tick = () => setCountdown(formatCountdown(item.expiresAt!));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isActive, item.expiresAt]);

  const handleRedeem = async () => {
    setRedeeming(true);
    setError(null);
    const res = await redeemPromoCode(item.id);
    setRedeeming(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setConfirmOpen(false);
    onRedeemed(item.id);
  };

  return (
    <div className="bg-white border border-cream-300 rounded-2xl shadow-card overflow-hidden">
      <div className="p-5 border-b border-cream-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-ink-muted text-xs">{item.partnerName}</p>
            <h3 className="text-forest font-medium">{item.privilegeTitle}</h3>
          </div>
          <span className="bg-primary/15 text-primary-dark text-xs font-bold px-2.5 py-1 rounded-lg border border-primary/20 shrink-0">
            {item.discountLabel}
          </span>
        </div>
        {isActive && item.expiresAt && (
          <div className="mt-3 flex items-center gap-2 text-amber-700 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Clock size={13} />
            <span>
              Expires in <strong className="font-mono">{countdown}</strong> — unused codes return to the pool
            </span>
          </div>
        )}
        {item.status === "redeemed" && item.redeemedAt && (
          <div className="mt-3 flex items-center gap-2 text-emerald-700 text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 size={13} />
            Used on {new Date(item.redeemedAt).toLocaleString()}
          </div>
        )}
      </div>

      <div className="p-5">
        {isActive && (
          <div
            className="flex gap-1 mb-4 p-1 rounded-full bg-cream-100 border border-cream-300 w-fit"
            role="tablist"
          >
            {(
              [
                { id: "qr" as const, label: "QR", icon: QrCode },
                { id: "text" as const, label: "Text", icon: Type },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={displayMode === id}
                onClick={() => setDisplayMode(id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                  displayMode === id
                    ? "bg-forest-900 text-cream-100"
                    : "text-ink-muted hover:text-forest"
                )}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="bg-cream-100 border border-cream-300 rounded-2xl p-4 flex items-center justify-center min-h-[180px] mb-4">
          {isActive && displayMode === "qr" ? (
            <QRCodeCanvas
              value={qrValue}
              size={160}
              level="M"
              includeMargin
              fgColor="#0A1F14"
              bgColor="#FAF7F2"
            />
          ) : (
            <div className="text-center px-2">
              <p className="text-ink-muted text-[10px] uppercase tracking-[2px] mb-2">Promo code</p>
              <p className="text-forest font-mono text-xl sm:text-2xl font-semibold tracking-widest break-all">
                {item.code}
              </p>
            </div>
          )}
        </div>

        {isActive && (
          <>
            <p className="text-ink-muted text-xs mb-3 text-center">
              Show this code to partner staff, then confirm once you have used the privilege.
            </p>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="btn-primary w-full py-3 text-sm"
            >
              ใช้สิทธิ์เรียบร้อย
            </button>
          </>
        )}

        {error && (
          <p className="text-red-600 text-xs mt-2 text-center">{error}</p>
        )}
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/60 backdrop-blur-sm"
          onClick={() => {
            if (!redeeming) setConfirmOpen(false);
          }}
          role="presentation"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-cream-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-forest font-semibold text-lg mb-2">ยืนยันการใช้สิทธิ์</h4>
            <p className="text-ink-light text-sm mb-6">
              คุณใช้สิทธิ์นี้ที่ร้านแล้วใช่หรือไม่? โค้ด{" "}
              <span className="font-mono font-semibold text-forest">{item.code}</span> จะไม่สามารถใช้ซ้ำได้
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-xl border border-cream-300 py-2.5 text-sm text-ink-light hover:bg-cream-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={redeeming}
                onClick={() => void handleRedeem()}
                className="flex-1 rounded-xl bg-forest-900 py-2.5 text-sm text-cream-100 hover:bg-forest-800 disabled:opacity-50"
              >
                {redeeming ? "กำลังยืนยัน…" : "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      )}
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

  const handleRedeemed = (id: string) => {
    setCodes((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: "redeemed" as const, redeemedAt: new Date().toISOString() }
          : c
      )
    );
  };

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="section-eyebrow text-primary-dark mb-1">My Privileges</p>
        <h1 className="text-3xl font-light text-forest flex items-center gap-3">
          <Tag size={24} className="text-primary-dark" strokeWidth={1.5} />
          View My Codes
        </h1>
        <p className="text-ink-muted text-sm mt-2">
          Codes you claimed are reserved for 24 hours. Confirm use after redeeming at the partner.
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
              : "Codes you confirm as used will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {shown.map((item) => (
            <PromoCodeCard key={item.id} item={item} onRedeemed={handleRedeemed} />
          ))}
        </div>
      )}
    </div>
  );
}
