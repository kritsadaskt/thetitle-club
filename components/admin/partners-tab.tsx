"use client";

import { useCallback, useEffect, useState } from "react";
import { createPartnerWithLogo, fetchAllPartners } from "@/lib/supabase/data";
import type { ShopPartner } from "@/lib/types";
import { Building2, ChevronRight, Plus } from "lucide-react";
import { cn, sortAdminByActiveThenCreated } from "@/lib/utils";
import { AddPartnerForm } from "./add-partner-form";
import { PartnerDetail } from "./partner-detail";

export function PartnersTab() {
  const [partners, setPartners] = useState<ShopPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddPartner, setShowAddPartner] = useState(false);

  const loadPartners = useCallback(async () => {
    setLoading(true);
    const rows = await fetchAllPartners();
    setPartners(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  const selected = partners.find((p) => p.id === selectedId) ?? null;

  const handlePartnerCreated = async () => {
    await loadPartners();
  };

  if (selected) {
    return (
      <PartnerDetail
        partner={selected}
        onBack={() => setSelectedId(null)}
        onPartnerUpdated={(updated) => {
          setPartners((prev) =>
            sortAdminByActiveThenCreated(
              prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
            )
          );
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-ink-muted text-xs tracking-[2px] uppercase font-semibold">All Partners</h2>
        <button
          type="button"
          onClick={() => setShowAddPartner(true)}
          className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
        >
          <Plus size={14} /> Add Partner
        </button>
      </div>
      <p className="text-ink-muted text-xs mb-4 max-w-2xl">
        Add a partner shop first, then open it to create privileges and manage promo codes.
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : partners.length === 0 ? (
        <div className="bg-white border border-cream-300 rounded-2xl p-10 text-center shadow-card">
          <Building2 size={32} className="text-ink-muted mx-auto mb-3" strokeWidth={1} />
          <p className="text-forest font-medium">No partners yet</p>
          <p className="text-ink-muted text-sm mt-2">Create your first partner shop to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {partners.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className="bg-white border border-cream-300 rounded-2xl p-5 shadow-card text-left hover:border-primary/40 hover:shadow-md transition-all flex items-center gap-4"
            >
              {p.logoUrl ? (
                <img src={p.logoUrl} alt={p.name} className="w-20 h-auto object-contain p-1 rounded-lg" />
              ) : (
                <div className="w-14 h-10 rounded-lg border border-cream-300 bg-cream-100 flex items-center justify-center shrink-0 overflow-hidden">
                  <span className="text-forest font-bold">{p.name.charAt(0)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-forest font-medium truncate">{p.name}</p>
                <p className="text-ink-muted text-xs mt-0.5">
                  {p.privilegeCount ?? 0} privilege{(p.privilegeCount ?? 0) === 1 ? "" : "s"}
                </p>
                <span
                  className={cn(
                    "inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full border font-medium",
                    p.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                  )}
                >
                  {p.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <ChevronRight size={18} className="text-ink-muted shrink-0" />
            </button>
          ))}
        </div>
      )}

      <AddPartnerForm
        open={showAddPartner}
        title="Add Partner"
        submitLabel="Create Partner"
        onClose={() => setShowAddPartner(false)}
        onSubmit={async (input, logoFile) => {
          const res = await createPartnerWithLogo(input, logoFile);
          if (!res.ok) return { ok: false, error: res.error };
          await handlePartnerCreated();
          return { ok: true };
        }}
      />
    </div>
  );
}
