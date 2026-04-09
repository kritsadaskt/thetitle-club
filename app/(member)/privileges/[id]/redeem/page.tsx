"use client";

import { useEffect, useState, useRef } from "react";
import { notFound, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchPrivilegeById } from "@/lib/supabase/data";
import { createClient } from "@/lib/supabase/client";
import type { Privilege } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function RedeemPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { member } = useAuth();
  const [priv, setPriv] = useState<Privilege | null | undefined>(undefined);
  const [now, setNow] = useState(new Date());
  const loggedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const row = await fetchPrivilegeById(id);
      if (!cancelled) setPriv(row);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!member || !priv || loggedRef.current) return;
    loggedRef.current = true;
    const supabase = createClient();
    void supabase.from("redemption_logs").insert({
      member_id: member.id,
      privilege_id: priv.id,
      method: "qr",
    });
  }, [member, priv]);

  if (priv === undefined) {
    return (
      <div className="fixed inset-0 bg-forest-900 z-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!priv || !member) return notFound();

  const qrValue = `TTC:${member.qrToken}:${priv.id}:${Date.now()}`;
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 bg-forest-900 z-50 flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,#163B2B_0%,#0A1F14_70%)] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

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
        <p className="section-eyebrow text-gold/60 mb-2">Redeeming</p>
        <p className="text-gold font-semibold text-xl">{priv.partnerName}</p>
        <p className="text-white/50 text-sm mb-5">{priv.title}</p>

        <div className="bg-gold/15 border border-gold/30 rounded-full px-7 py-2.5 mb-8 shadow-gold-sm">
          <p className="text-gold font-bold tracking-widest">{priv.discountLabel}</p>
        </div>

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

        <p className="text-white text-2xl font-light">{member.fullName}</p>
        <p className="text-gold font-mono tracking-widest text-sm mt-2">{member.memberId}</p>

        <div className="mt-6">
          <p className="text-white/25 text-xs">{dateStr}</p>
          <p className="text-white/45 font-mono mt-0.5">{timeStr}</p>
        </div>
      </div>
    </div>
  );
}
