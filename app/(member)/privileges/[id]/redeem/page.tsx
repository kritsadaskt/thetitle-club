"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { MOCK_PRIVILEGES } from "@/lib/mock-data";
import { QRCodeSVG } from "qrcode.react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function RedeemPage({ params }: { params: { id: string } }) {
  const { member } = useAuth();
  const priv = MOCK_PRIVILEGES.find((p) => p.id === params.id);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!priv || !member) return notFound();

  const qrValue = `TTC:${member.qrToken}:${priv.id}:${Date.now()}`;
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    /* Full-screen — Midnight Green */
    <div className="fixed inset-0 bg-forest-900 z-50 flex flex-col">
      {/* Bg texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,#163B2B_0%,#0A1F14_70%)] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/8">
        <Link href={`/privileges/${priv.id}`}
          className="flex items-center gap-2 text-white/50 hover:text-white/80 text-sm transition-colors">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-xs font-medium">Verified Member</span>
          <ShieldCheck size={14} className="text-emerald-400" />
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-8 text-center overflow-y-auto">

        {/* Privilege label */}
        <p className="section-eyebrow text-gold/60 mb-2">Redeeming</p>
        <p className="text-gold font-semibold text-xl">{priv.partnerName}</p>
        <p className="text-white/50 text-sm mb-5">{priv.title}</p>

        {/* Discount badge */}
        <div className="bg-gold/15 border border-gold/30 rounded-full px-7 py-2.5 mb-8 shadow-gold-sm">
          <p className="text-gold font-bold tracking-widest">{priv.discountLabel}</p>
        </div>

        {/* QR Code — cream background */}
        <div className="bg-cream-100 border-4 border-cream-200 p-5 rounded-3xl shadow-2xl mb-7">
          <QRCodeSVG
            value={qrValue}
            size={200}
            level="H"
            includeMargin={false}
            fgColor="#0A1F14"
            bgColor="#FAF7F2"
          />
        </div>

        {/* Member info */}
        <p className="text-white text-2xl font-light">{member.fullName}</p>
        <p className="text-gold font-mono tracking-widest text-sm mt-2">{member.memberId}</p>

        {/* Live clock */}
        <div className="mt-6">
          <p className="text-white/25 text-xs">{dateStr}</p>
          <p className="text-white/45 font-mono mt-0.5">{timeStr}</p>
        </div>

        {/* Instruction card */}
        <div className="mt-8 max-w-xs bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/35 text-xs leading-relaxed">
            Show this screen to partner staff. They will verify your membership and apply the discount to your purchase.
          </p>
        </div>
      </div>
    </div>
  );
}
