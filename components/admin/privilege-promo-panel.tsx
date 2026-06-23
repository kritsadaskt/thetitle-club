"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  bulkInsertPromoCodes,
  fetchPromoCodeStats,
  fetchPromoCodesForPrivilege,
  updatePrivilegeCodeMode,
} from "@/lib/supabase/data";
import { parseCodesFromFile, parseCodesFromText } from "@/lib/promo-code-import";
import type { CodeMode, Privilege, PromoCode, PromoCodeStats } from "@/lib/types";
import { ChevronDown, ChevronUp, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  privileges: Privilege[];
  codeDrafts: Record<string, string>;
  onCodeDraftChange: (id: string, value: string) => void;
  onSaveSharedCode: (id: string) => Promise<void>;
  onPrivilegeUpdate: (id: string, patch: Partial<Privilege>) => void;
  savingCodeId: string | null;
};

export function PrivilegePromoPanel({
  privileges,
  codeDrafts,
  onCodeDraftChange,
  onSaveSharedCode,
  onPrivilegeUpdate,
  savingCodeId,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, PromoCodeStats>>({});
  const [preview, setPreview] = useState<Record<string, PromoCode[]>>({});
  const [pasteText, setPasteText] = useState<Record<string, string>>({});
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<Record<string, string>>({});
  const [modeSavingId, setModeSavingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  const loadPoolData = useCallback(async (privilegeId: string) => {
    const [s, codes] = await Promise.all([
      fetchPromoCodeStats(privilegeId),
      fetchPromoCodesForPrivilege(privilegeId, 30),
    ]);
    setStats((prev) => ({ ...prev, [privilegeId]: s }));
    setPreview((prev) => ({ ...prev, [privilegeId]: codes }));
  }, []);

  useEffect(() => {
    if (!expandedId) return;
    const priv = privileges.find((p) => p.id === expandedId);
    if (priv?.codeMode === "unique_pool") {
      void loadPoolData(expandedId);
    }
  }, [expandedId, privileges, loadPoolData]);

  const changeCodeMode = async (privilegeId: string, mode: CodeMode) => {
    setModeSavingId(privilegeId);
    const res = await updatePrivilegeCodeMode(privilegeId, mode);
    setModeSavingId(null);
    if (res.ok) {
      onPrivilegeUpdate(privilegeId, { codeMode: mode });
      if (mode === "unique_pool") void loadPoolData(privilegeId);
    }
  };

  const importCodes = async (privilegeId: string, codes: string[]) => {
    if (codes.length === 0) {
      setImportMsg((prev) => ({ ...prev, [privilegeId]: "No valid codes found." }));
      return;
    }
    setImportingId(privilegeId);
    const res = await bulkInsertPromoCodes(privilegeId, codes);
    setImportingId(null);
    if (res.error) {
      setImportMsg((prev) => ({ ...prev, [privilegeId]: res.error! }));
      return;
    }
    setImportMsg((prev) => ({
      ...prev,
      [privilegeId]: `Added ${res.inserted} code(s)${res.skipped > 0 ? `, ${res.skipped} duplicate(s) skipped` : ""}.`,
    }));
    setPasteText((prev) => ({ ...prev, [privilegeId]: "" }));
    void loadPoolData(privilegeId);
  };

  const handleFileUpload = async (privilegeId: string, file: File) => {
    try {
      const codes = await parseCodesFromFile(file);
      await importCodes(privilegeId, codes);
    } catch (e) {
      setImportMsg((prev) => ({
        ...prev,
        [privilegeId]: e instanceof Error ? e.message : "Failed to read file",
      }));
    }
  };

  return (
    <div className="space-y-4">
      {privileges.map((p) => {
        const isOpen = expandedId === p.id;
        const poolStats = stats[p.id];
        const codes = preview[p.id] ?? [];

        return (
          <div
            key={p.id}
            className="bg-white border border-cream-300 rounded-2xl shadow-card overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpandedId(isOpen ? null : p.id)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-cream-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-forest font-medium text-sm">{p.title}</p>
                <p className="text-ink-muted text-xs mt-0.5">{p.partnerName}</p>
              </div>
              <span className="bg-primary/15 text-primary-dark text-xs font-bold px-2.5 py-1 rounded-lg border border-primary/20 shrink-0">
                {p.discountLabel}
              </span>
              <span
                className={cn(
                  "text-xs px-2.5 py-0.5 rounded-full border font-medium shrink-0",
                  p.isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-gray-100 text-gray-500 border-gray-200"
                )}
              >
                {p.isActive ? "Active" : "Inactive"}
              </span>
              <span className="text-ink-muted text-xs shrink-0 hidden sm:inline">
                {p.codeMode === "unique_pool" ? "Unique pool" : "Shared"}
              </span>
              {isOpen ? <ChevronUp size={16} className="text-ink-muted" /> : <ChevronDown size={16} className="text-ink-muted" />}
            </button>

            {isOpen && (
              <div className="px-5 pb-5 border-t border-cream-200 pt-4 space-y-4">
                <div>
                  <label className="text-ink-muted text-xs font-semibold uppercase tracking-wide block mb-2">
                    Code Mode
                  </label>
                  <select
                    value={p.codeMode}
                    disabled={modeSavingId === p.id}
                    onChange={(e) => void changeCodeMode(p.id, e.target.value as CodeMode)}
                    className="rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="shared">Shared — same code for everyone</option>
                    <option value="unique_pool">Unique pool — limited one-time codes</option>
                  </select>
                </div>

                {p.codeMode === "shared" ? (
                  <div>
                    <label className="text-ink-muted text-xs font-semibold uppercase tracking-wide block mb-2">
                      Privilege Code (QR)
                    </label>
                    <div className="flex items-center gap-2 max-w-md">
                      <input
                        type="text"
                        value={codeDrafts[p.id] ?? ""}
                        onChange={(e) => onCodeDraftChange(p.id, e.target.value)}
                        placeholder="e.g. TTC-BDMS-15"
                        className="flex-1 rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm font-mono text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                      <button
                        type="button"
                        disabled={savingCodeId === p.id}
                        onClick={() => void onSaveSharedCode(p.id)}
                        className="shrink-0 rounded-lg bg-forest-900 px-4 py-2 text-xs font-medium text-cream-100 hover:bg-forest-800 disabled:opacity-50"
                      >
                        {savingCodeId === p.id ? "…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {poolStats && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(
                          [
                            ["Total", poolStats.total],
                            ["Available", poolStats.available],
                            ["Claimed", poolStats.claimed],
                            ["Redeemed", poolStats.redeemed],
                          ] as const
                        ).map(([label, value]) => (
                          <div key={label} className="bg-cream-100 border border-cream-300 rounded-xl px-4 py-3">
                            <p className="text-ink-muted text-[10px] uppercase tracking-wide">{label}</p>
                            <p className="text-forest text-xl font-light mt-1">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <label className="text-ink-muted text-xs font-semibold uppercase tracking-wide block mb-2">
                        Paste codes (one per line)
                      </label>
                      <textarea
                        value={pasteText[p.id] ?? ""}
                        onChange={(e) => setPasteText((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        rows={4}
                        placeholder={"PROMO-001\nPROMO-002\nPROMO-003"}
                        className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm font-mono text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          type="button"
                          disabled={importingId === p.id}
                          onClick={() => void importCodes(p.id, parseCodesFromText(pasteText[p.id] ?? ""))}
                          className="rounded-lg bg-forest-900 px-4 py-2 text-xs font-medium text-cream-100 hover:bg-forest-800 disabled:opacity-50"
                        >
                          {importingId === p.id ? "Importing…" : "Import from text"}
                        </button>
                        <button
                          type="button"
                          disabled={importingId === p.id}
                          onClick={() => {
                            setUploadTargetId(p.id);
                            fileRef.current?.click();
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-cream-300 bg-white px-4 py-2 text-xs font-medium text-forest hover:bg-cream-50 disabled:opacity-50"
                        >
                          <Upload size={13} /> Upload Excel / CSV
                        </button>
                      </div>
                      {importMsg[p.id] && (
                        <p className="text-xs mt-2 text-ink-light">{importMsg[p.id]}</p>
                      )}
                    </div>

                    {codes.length > 0 && (
                      <div>
                        <p className="text-ink-muted text-xs font-semibold uppercase tracking-wide mb-2">
                          Recent codes
                        </p>
                        <div className="border border-cream-300 rounded-xl overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-cream-100 border-b border-cream-300">
                                {["Code", "Status", "Claimed", "Redeemed"].map((h) => (
                                  <th key={h} className="px-3 py-2 text-left text-ink-muted font-semibold">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-cream-200">
                              {codes.map((c) => (
                                <tr key={c.id}>
                                  <td className="px-3 py-2 font-mono text-forest">{c.code}</td>
                                  <td className="px-3 py-2 capitalize">{c.status}</td>
                                  <td className="px-3 py-2 text-ink-muted">
                                    {c.claimedAt ? new Date(c.claimedAt).toLocaleString() : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-ink-muted">
                                    {c.redeemedAt ? new Date(c.redeemedAt).toLocaleString() : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadTargetId) void handleFileUpload(uploadTargetId, file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
