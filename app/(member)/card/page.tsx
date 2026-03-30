"use client";

import { useAuth } from "@/lib/auth-context";
import { QRCodeSVG } from "qrcode.react";
import { Share2, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function CardPage() {
  const { member } = useAuth();
  if (!member) return null;

  const qrValue   = `TTC:${member.qrToken}:${member.memberId}`;
  const joinedDate = member.approvedAt ? formatDate(member.approvedAt) : "—";

  return (
    <div className="p-6 lg:p-10 max-w-xl mx-auto">
      <h1 className="text-2xl font-light text-forest mb-1">Membership Card</h1>
      <p className="text-ink-muted text-sm mb-8">
        Show your card or QR code to partners when redeeming privileges
      </p>

      {/* ── Digital Card (Midnight Green) ── */}
      <div className="relative rounded-2xl overflow-hidden bg-forest-900 border border-forest-700/50 p-7 mb-6 shadow-xl">
        {/* Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,#163B2B_0%,#0A1F14_65%)]" />
        <div className="absolute top-0 right-0 w-56 h-56 bg-gold/6 rounded-full -translate-y-1/3 translate-x-1/3 blur-3xl" />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #C9A96E 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        {/* Header */}
        <div className="relative flex justify-between items-start mb-8">
          <div>
            <p className="section-eyebrow text-gold/70 text-[9px]">The Title Residence</p>
            <p className="text-white font-semibold tracking-[3px] text-base mt-0.5">CLUB</p>
          </div>
          <div className="bg-gold/20 border border-gold/35 rounded-lg px-3 py-1.5">
            <p className="text-gold text-[11px] font-bold tracking-widest">MEMBER</p>
          </div>
        </div>

        {/* Member info */}
        <div className="relative mb-6">
          <p className="text-white/35 text-xs mb-1">Member Name</p>
          <p className="text-white text-xl font-light tracking-wide">{member.fullName}</p>
          <div className="flex flex-wrap gap-5 mt-3">
            <div>
              <p className="text-white/25 text-[10px] uppercase tracking-wider">Status</p>
              <p className="text-white/65 text-xs capitalize mt-0.5">{member.residentStatus}</p>
            </div>
            <div>
              <p className="text-white/25 text-[10px] uppercase tracking-wider">Project</p>
              <p className="text-white/65 text-xs mt-0.5">{member.projectName.replace("The Title ", "")}</p>
            </div>
            <div>
              <p className="text-white/25 text-[10px] uppercase tracking-wider">Since</p>
              <p className="text-white/65 text-xs mt-0.5">{joinedDate}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex items-end justify-between border-t border-white/10 pt-5">
          <div>
            <p className="text-white/25 text-[10px] uppercase tracking-wider mb-1">Member ID</p>
            <p className="text-gold font-mono font-semibold tracking-[3px] text-sm">{member.memberId}</p>
          </div>
          {/* Gold bar deco */}
          <div className="flex gap-1 items-end">
            {[20, 28, 16, 24, 12].map((h, i) => (
              <div key={i} className="w-1 rounded-full bg-gold/30" style={{ height: h }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── QR Code (Cream card) ── */}
      <div className="bg-white border border-cream-300 rounded-2xl p-6 mb-6 text-center shadow-card">
        <p className="section-eyebrow text-ink-muted text-[10px] mb-5">Scan to Verify Membership</p>
        <div className="inline-block bg-cream-100 border border-cream-300 p-4 rounded-2xl mb-4 shadow-sm">
          <QRCodeSVG
            value={qrValue}
            size={180}
            level="H"
            includeMargin={false}
            fgColor="#0A1F14"
            bgColor="#FAF7F2"
          />
        </div>
        <p className="text-ink-muted text-xs font-mono">{member.qrToken}</p>
        <p className="text-ink-muted text-[11px] mt-1.5 max-w-xs mx-auto">
          Present this QR code to partner staff when redeeming your privileges
        </p>
      </div>

      {/* ── Actions ── */}
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-ghost-light flex items-center justify-center gap-2 text-sm py-3">
          <Share2 size={14} /> Share Card
        </button>
        <button className="btn-ghost-light flex items-center justify-center gap-2 text-sm py-3">
          <Download size={14} /> Save to Photos
        </button>
      </div>

      <p className="text-ink-muted text-xs text-center mt-6">
        This card is for THE TITLE CLUB members only. Do not share your QR code.
      </p>
    </div>
  );
}
