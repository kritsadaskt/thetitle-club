"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { MOCK_PRIVILEGES } from "@/lib/mock-data";
import { categoryLabel, categoryColor } from "@/lib/utils";
import { ArrowLeft, CheckCircle, Ticket } from "lucide-react";

export default function PrivilegeDetailPage({ params }: { params: { id: string } }) {
  const priv = MOCK_PRIVILEGES.find((p) => p.id === params.id);
  if (!priv) return notFound();

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/privileges"
        className="inline-flex items-center gap-2 text-ink-muted hover:text-forest text-sm mb-6 transition-colors font-medium">
        <ArrowLeft size={14} /> Back to Privileges
      </Link>

      {/* Cover */}
      <div className="relative h-56 md:h-72 rounded-2xl overflow-hidden mb-6 shadow-card">
        <img src={priv.coverImage} alt={priv.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-900/70 to-transparent" />
        <span className="absolute top-4 right-4 bg-gold text-forest-900 font-bold px-4 py-1.5 rounded-full shadow-gold-sm">
          {priv.discountLabel}
        </span>
        <span className={`absolute bottom-4 left-4 text-xs px-2 py-1 rounded border ${categoryColor(priv.category)}`}>
          {categoryLabel(priv.category)}
        </span>
      </div>

      {/* Partner */}
      <div className="flex items-center gap-4 mb-6">
        <img src={priv.partnerLogo} alt={priv.partnerName}
          className="w-20 h-12 object-contain bg-cream-200 border border-cream-300 rounded-xl p-2" />
        <div>
          <p className="text-ink-muted text-xs">{priv.partnerName}</p>
          <h1 className="text-2xl font-light text-forest">{priv.title}</h1>
        </div>
      </div>

      {/* Validity banner */}
      {priv.validUntil && (
        <div className="bg-gold/10 border border-gold/25 rounded-xl px-4 py-3 mb-6 text-sm text-gold-dark flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
          Valid until <strong>{priv.validUntil}</strong>
        </div>
      )}

      {/* Description */}
      <section className="mb-7">
        <h2 className="text-forest font-semibold mb-3">About This Privilege</h2>
        <p className="text-ink-light leading-relaxed">{priv.description}</p>
      </section>

      {/* How to Redeem */}
      <section className="mb-7 bg-forest-50 border border-forest-100 rounded-2xl p-5">
        <h2 className="text-forest font-semibold mb-4 flex items-center gap-2">
          <Ticket size={15} className="text-gold-dark" />
          How to Redeem
        </h2>
        <div className="space-y-3">
          {priv.howToRedeem.split("\n").map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-ink-light">
              <CheckCircle size={14} className="text-forest-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
              {step.replace(/^\d+\.\s*/, "")}
            </div>
          ))}
        </div>
      </section>

      {/* Terms */}
      <section className="mb-10">
        <h2 className="text-forest font-semibold mb-3">Terms & Conditions</h2>
        <div className="space-y-2">
          {priv.terms.split("\n").map((t, i) => (
            <p key={i} className="text-ink-muted text-sm">{t}</p>
          ))}
        </div>
      </section>

      {/* CTA — sticky */}
      <div className="sticky bottom-6">
        <Link href={`/privileges/${priv.id}/redeem`}
          className="btn-gold w-full text-center text-base flex items-center justify-center gap-2 py-4 shadow-gold-md">
          <Ticket size={18} />
          Use This Privilege
        </Link>
      </div>
    </div>
  );
}
