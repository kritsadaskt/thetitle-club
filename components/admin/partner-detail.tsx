"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createPrivilege,
  fetchPrivilegesByPartner,
  updatePartner,
} from "@/lib/supabase/data";
import type { CreatePartnerInput, CreatePrivilegeInput, Privilege, ShopPartner } from "@/lib/types";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddPartnerForm } from "./add-partner-form";
import { AddPrivilegeForm } from "./add-privilege-form";
import { PrivilegePromoPanel } from "./privilege-promo-panel";

type Props = {
  partner: ShopPartner;
  onBack: () => void;
  onPartnerUpdated: (partner: ShopPartner) => void;
};

export function PartnerDetail({ partner, onBack, onPartnerUpdated }: Props) {
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [savingCodeId, setSavingCodeId] = useState<string | null>(null);
  const [codeSaveError, setCodeSaveError] = useState<string | null>(null);
  const [showAddPrivilege, setShowAddPrivilege] = useState(false);
  const [showEditPartner, setShowEditPartner] = useState(false);

  const loadPrivileges = useCallback(async () => {
    setLoading(true);
    const rows = await fetchPrivilegesByPartner(partner.id);
    setPrivileges(rows);
    setCodeDrafts(Object.fromEntries(rows.map((p) => [p.id, p.privilegeCode])));
    setLoading(false);
  }, [partner.id]);

  useEffect(() => {
    void loadPrivileges();
  }, [loadPrivileges]);

  const savePrivilegeCode = async (privilegeId: string) => {
    setCodeSaveError(null);
    setSavingCodeId(privilegeId);
    const supabase = createClient();
    const code = codeDrafts[privilegeId]?.trim() ?? "";
    const { error } = await supabase
      .from("privileges")
      .update({ privilege_code: code || null })
      .eq("id", privilegeId);
    setSavingCodeId(null);
    if (error) {
      setCodeSaveError(error.message);
      return;
    }
    setPrivileges((prev) =>
      prev.map((p) => (p.id === privilegeId ? { ...p, privilegeCode: code } : p))
    );
  };

  const handleCreatePrivilege = async (input: CreatePrivilegeInput) => {
    const res = await createPrivilege(partner.id, input);
    if (!res.ok) return { ok: false, error: res.error };
    setPrivileges((prev) => [...prev, res.data].sort((a, b) => a.sortOrder - b.sortOrder));
    setCodeDrafts((prev) => ({ ...prev, [res.data.id]: res.data.privilegeCode }));
    onPartnerUpdated({
      ...partner,
      privilegeCount: (partner.privilegeCount ?? privileges.length) + 1,
    });
    return { ok: true };
  };

  const handleUpdatePartner = async (input: CreatePartnerInput) => {
    const res = await updatePartner(partner.id, input);
    if (!res.ok) return { ok: false, error: res.error };
    onPartnerUpdated(res.data);
    return { ok: true };
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-ink-muted hover:text-forest text-sm mb-6 transition-colors font-medium"
      >
        <ArrowLeft size={14} /> Back to Partners
      </button>

      <div className="bg-white border border-cream-300 rounded-2xl p-5 mb-6 shadow-card flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="w-20 h-14 rounded-xl border border-cream-300 bg-cream-100 flex items-center justify-center shrink-0 overflow-hidden">
          {partner.logoUrl ? (
            <img src={partner.logoUrl} alt={partner.name} className="max-w-full max-h-full object-contain p-1" />
          ) : (
            <span className="text-forest font-bold text-lg">{partner.name.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-light text-forest">{partner.name}</h2>
            <span
              className={cn(
                "text-xs px-2.5 py-0.5 rounded-full border font-medium",
                partner.isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              )}
            >
              {partner.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          {partner.websiteUrl && (
            <a
              href={partner.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-dark text-xs hover:underline mt-1 inline-block"
            >
              {partner.websiteUrl}
            </a>
          )}
          {partner.description && (
            <p className="text-ink-muted text-sm mt-2">{partner.description}</p>
          )}
          <p className="text-ink-muted text-xs mt-2">
            {privileges.length} privilege{privileges.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowEditPartner(true)}
          className="flex items-center gap-1.5 rounded-xl border border-cream-300 px-4 py-2 text-xs font-medium text-forest hover:bg-cream-50 shrink-0"
        >
          <Pencil size={13} /> Edit Partner
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-ink-muted text-xs tracking-[2px] uppercase font-semibold">Privileges</h3>
        <button
          type="button"
          onClick={() => setShowAddPrivilege(true)}
          className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
        >
          <Plus size={14} /> Add Privilege
        </button>
      </div>

      {codeSaveError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not save privilege code: {codeSaveError}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : privileges.length === 0 ? (
        <div className="bg-white border border-cream-300 rounded-2xl p-10 text-center shadow-card">
          <p className="text-forest font-medium">No privileges yet</p>
          <p className="text-ink-muted text-sm mt-2">Add the first privilege for this partner.</p>
        </div>
      ) : (
        <PrivilegePromoPanel
          privileges={privileges}
          codeDrafts={codeDrafts}
          onCodeDraftChange={(id, value) =>
            setCodeDrafts((prev) => ({ ...prev, [id]: value }))
          }
          onSaveSharedCode={savePrivilegeCode}
          onPrivilegeUpdate={(id, patch) =>
            setPrivileges((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
          }
          savingCodeId={savingCodeId}
        />
      )}

      <AddPrivilegeForm
        open={showAddPrivilege}
        partnerName={partner.name}
        onClose={() => setShowAddPrivilege(false)}
        onSubmit={handleCreatePrivilege}
      />

      <AddPartnerForm
        key={partner.id}
        open={showEditPartner}
        title="Edit Partner"
        submitLabel="Save Changes"
        initial={{
          name: partner.name,
          logoUrl: partner.logoUrl,
          websiteUrl: partner.websiteUrl,
          description: partner.description,
          isActive: partner.isActive,
          sortOrder: partner.sortOrder,
        }}
        onClose={() => setShowEditPartner(false)}
        onSubmit={handleUpdatePartner}
      />
    </div>
  );
}
