"use client";

import { useEffect, useState, useRef } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  fetchMemberPromoCodeForPrivilege,
  fetchPrivilegeById,
  redeemPromoCode,
} from "@/lib/supabase/data";
import { createClient } from "@/lib/supabase/client";
import type { MemberPromoCode, Privilege } from "@/lib/types";
import { QRCodeCanvas } from "qrcode.react";
import Link from "next/link";
import { ArrowLeft, Clock, QrCode, ShieldCheck, Tag, Type } from "lucide-react";
import { buildRedeemQrValue } from "@/lib/qr";
import { formatCountdown } from "@/lib/promo-code-import";
import { cn } from "@/lib/utils";

type DisplayMode = "qr" | "text";

export default function RedeemPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const { member } = useAuth();
  const [priv, setPriv] = useState<Privilege | null | undefined>(undefined);
  const [memberCode, setMemberCode] = useState<MemberPromoCode | null | undefined>(undefined);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("qr");
  const [countdown, setCountdown] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const loggedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const row = await fetchPrivilegeById(id);
      if (cancelled) return;
      setPriv(row);

      if (!row) return;

      if (row.codeMode === "unique_pool") {
        const code = await fetchMemberPromoCodeForPrivilege(id);
        if (cancelled) return;
        if (!code || code.status !== "claimed") {
          router.replace(`/privileges/${id}`);
          return;
        }
        setMemberCode(code);
      } else {
        setMemberCode(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  useEffect(() => {
    if (!member || !priv || loggedRef.current) return;
    if (priv.codeMode === "unique_pool" && memberCode === undefined) return;
    loggedRef.current = true;
    const supabase = createClient();
    void supabase.from("redemption_logs").insert({
      member_id: member.id,
      privilege_id: priv.id,
      method: "qr",
    });
  }, [member, priv, memberCode]);

  const isUniquePool = priv?.codeMode === "unique_pool";
  const expiresAt = memberCode?.expiresAt;

  useEffect(() => {
    if (!isUniquePool || !expiresAt) return;
    const tick = () => setCountdown(formatCountdown(expiresAt));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isUniquePool, expiresAt]);

  if (priv === undefined || (priv?.codeMode === "unique_pool" && memberCode === undefined)) {
    return (
      <div className="fixed inset-0 bg-forest-900 z-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!priv || !member) return notFound();

  const codeValue =
    priv.codeMode === "unique_pool" && memberCode
      ? memberCode.code
      : priv.privilegeCode;
  const qrValue = buildRedeemQrValue(codeValue);

  const handleRedeem = async () => {
    if (!memberCode) return;
    setRedeeming(true);
    setRedeemError(null);
    const res = await redeemPromoCode(memberCode.id);
    setRedeeming(false);
    if (!res.ok) {
      setRedeemError(res.error);
      return;
    }
    setConfirmOpen(false);
    router.push("/my-codes");
  };

  return (
    <div className="fixed inset-0 bg-forest-900 z-50 flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,#163B2B_0%,#0A1F14_70%)] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/8">
        <Link
          href={`/privileges/${priv.id}`}
          className="flex items-center gap-2 text-white/50 hover:text-white/80 text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-xs font-medium">Verified Member</span>
          <ShieldCheck size={14} className="text-emerald-400" />
        </div>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-8 text-center overflow-y-auto">
        <p className="section-eyebrow text-primary/60 mb-2">Redeeming</p>
        <p className="text-primary font-semibold text-xl">{priv.partnerName}</p>
        <p className="text-white/50 text-sm mb-5">{priv.title}</p>

        <div className="bg-primary/15 border border-primary/30 rounded-full px-7 py-2.5 mb-5 shadow-primary-sm">
          <p className="text-primary font-bold tracking-widest">{priv.discountLabel}</p>
        </div>

        {isUniquePool && expiresAt && (
          <div className="mb-5 flex items-center gap-2 text-amber-200 text-xs bg-amber-500/10 border border-amber-400/30 rounded-full px-4 py-2">
            <Clock size={13} />
            <span>
              Expires in <strong className="font-mono">{countdown}</strong>
            </span>
          </div>
        )}

        {qrValue && (
          <div
            className="flex gap-1 mb-5 p-1 rounded-full bg-white/8 border border-white/10"
            role="tablist"
            aria-label="Display mode"
          >
            {(
              [
                { id: "qr" as const, label: "QR Code", icon: QrCode },
                { id: "text" as const, label: "Text", icon: Type },
              ] as const
            ).map(({ id: modeId, label, icon: Icon }) => (
              <button
                key={modeId}
                type="button"
                role="tab"
                aria-selected={displayMode === modeId}
                onClick={() => setDisplayMode(modeId)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium transition-all",
                  displayMode === modeId
                    ? "bg-primary text-forest-900 shadow-primary-sm"
                    : "text-white/50 hover:text-white/80"
                )}
              >
                <Icon size={14} strokeWidth={displayMode === modeId ? 2 : 1.5} />
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="bg-cream-100 border-4 border-cream-200 p-5 rounded-3xl shadow-2xl mb-7 min-h-[240px] min-w-[240px] flex items-center justify-center">
          {!qrValue ? (
            <p className="text-forest-900 text-sm px-4 py-8 max-w-[220px]">
              No privilege code configured. Please contact THE TITLE support.
            </p>
          ) : displayMode === "qr" ? (
            <QRCodeCanvas
              value={qrValue}
              size={280}
              level="M"
              includeMargin
              fgColor="#0A1F14"
              bgColor="#FAF7F2"
              className="mx-auto h-[200px] w-[200px]"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-forest-900/50 text-[10px] uppercase tracking-[2px] mb-3">Privilege code</p>
              <p className="text-forest-900 font-mono text-2xl sm:text-3xl font-semibold tracking-widest break-all">
                {qrValue}
              </p>
            </div>
          )}
        </div>

        <p className="text-white text-2xl font-light">{member.fullName}</p>
        <p className="text-primary font-mono tracking-widest text-sm mt-2">{member.memberId}</p>
        <p className="text-white/35 text-xs mt-6 max-w-xs">
          {displayMode === "qr"
            ? "Show this QR to partner staff to scan your privilege code."
            : "Tell partner staff this code or show this screen for manual entry."}
        </p>

        {isUniquePool && memberCode && (
          <div className="mt-8 w-full max-w-sm space-y-3">
            {redeemError && (
              <p className="text-red-300 text-xs">{redeemError}</p>
            )}
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="btn-primary w-full py-3.5 text-sm font-semibold"
            >
              <span className="text-xs font-normal opacity-80">(For staff)</span> Mark as Used
            </button>
            <Link
              href="/my-codes"
              className="flex items-center justify-center gap-2 text-white/45 hover:text-white/75 text-sm transition-colors py-2"
            >
              <Tag size={14} />
              Back to My Codes
            </Link>
          </div>
        )}
      </div>

      {confirmOpen && memberCode && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-forest-900/70 backdrop-blur-sm"
          onClick={() => {
            if (!redeeming) setConfirmOpen(false);
          }}
          role="presentation"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-cream-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-forest font-semibold text-lg mb-2">Confirm Use</h4>
            <p className="text-ink-light text-sm mb-6">
              Have you used this privilege at the partner? The code{" "}
              <span className="font-mono font-semibold text-forest">{memberCode.code}</span> cannot
              be used again.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={redeeming}
                className="flex-1 rounded-xl border border-cream-300 py-2.5 text-sm text-ink-light hover:bg-cream-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={redeeming}
                onClick={() => void handleRedeem()}
                className="flex-1 rounded-xl bg-forest-900 py-2.5 text-sm text-cream-100 hover:bg-forest-800 disabled:opacity-50"
              >
                {redeeming ? "Confirming…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
