"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { fetchAllPrivileges } from "@/lib/supabase/data";
import { mapProfileToMember, type ProfileRow } from "@/lib/supabase/mappers";
import type { Member, Privilege } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Users, Gift, CheckCircle, XCircle, Clock, LogOut, TrendingUp, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Tab = "members" | "privileges";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
  pending_verification: "bg-sky-50 text-sky-700 border-sky-200",
  suspended: "bg-red-50 text-red-600 border-red-200",
  rejected: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function AdminPage() {
  const { isAdmin, logout, isLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("members");
  const [members, setMembers] = useState<Member[]>([]);
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [savingCodeId, setSavingCodeId] = useState<string | null>(null);
  const [codeSaveError, setCodeSaveError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    setLoadError(null);
    const [mRes, privs] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      fetchAllPrivileges(),
    ]);
    if (mRes.error) {
      setLoadError(mRes.error.message);
      setMembers([]);
    } else if (mRes.data) {
      setMembers(mRes.data.map((row) => mapProfileToMember(row as ProfileRow, "")));
    }
    setPrivileges(privs);
    setCodeDrafts(Object.fromEntries(privs.map((p) => [p.id, p.privilegeCode])));
    setDataLoading(false);
  }, []);

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

  useEffect(() => {
    if (!isLoading && !isAdmin) router.replace("/login");
  }, [isAdmin, isLoading, router]);

  useEffect(() => {
    if (isAdmin) void loadData();
  }, [isAdmin, loadData]);

  const approve = async (memberId: string) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({
        status: "active",
        approved_at: new Date().toISOString(),
        approved_by: user?.id ?? null,
      })
      .eq("id", memberId);
    if (!error) await loadData();
  };

  const reject = async (memberId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ status: "rejected" }).eq("id", memberId);
    if (!error) await loadData();
  };

  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  /** DB default is pending_verification; pending_approval is optional middle state — show both in queue */
  const pending = members.filter(
    (m) =>
      !m.isAdmin &&
      (m.status === "pending_approval" || m.status === "pending_verification")
  );
  const active = members.filter((m) => m.status === "active");

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="bg-deep-blue border-b border-white/8 px-8 py-4 flex items-center justify-between" style={{ backgroundImage: "url('/club/club-bg.webp')" }}>
        <div>
          <Link href="/" title="Back to Club Homepage">
            <img src="/club/title-club-logo_mockup-white.webp" alt="The Title" className="w-20 h-auto object-contain" />
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full font-medium">
            Administrator
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-2 text-white hover:text-red-400 cursor-pointer text-xs transition-colors"
          >
            <LogOut size={13} /> Logout
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-8">
        {loadError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Could not load members: {loadError}
          </div>
        )}
        <Link href="/" title="Back to Club Homepage" className="flex items-center gap-2 text-ink-muted text-xs hover:text-primary-dark transition-colors font-medium">
          <ArrowLeft size={15} />
          <span className="text-black/70 text-sm">Back Homepage</span>
        </Link>
        <div className="h-5"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Members", value: members.length, icon: Users, color: "bg-forest-50 text-forest-700" },
            { label: "Active", value: active.length, icon: CheckCircle, color: "bg-emerald-50 text-emerald-700" },
            { label: "Pending review", value: pending.length, icon: Clock, color: "bg-amber-50 text-amber-700" },
            {
              label: "Privileges Active",
              value: privileges.filter((p) => p.isActive).length,
              icon: Gift,
              color: "bg-primary/10 text-primary-dark",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-cream-300 rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={15} strokeWidth={1.5} />
                </div>
                <span className="text-ink-muted text-xs font-medium">{label}</span>
              </div>
              <p className="text-3xl font-light text-forest">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 mb-6 bg-white border border-cream-300 rounded-xl p-1 w-fit shadow-sm">
          {(["members", "privileges"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "px-5 py-2 rounded-lg text-sm capitalize transition-all font-medium",
                tab === t ? "bg-forest-900 text-cream-100" : "text-ink-light hover:text-forest"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "members" && (
          <div>
            {dataLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {pending.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-amber-700 text-xs tracking-[2px] uppercase font-semibold mb-4 flex items-center gap-2">
                      <Clock size={12} /> Awaiting review ({pending.length})
                    </h2>
                    <div className="space-y-3">
                      {pending.map((m) => (
                        <div
                          key={m.id}
                          className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm"
                        >
                          <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 font-bold shrink-0">
                            {m.fullName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-forest font-semibold text-sm">{m.fullName}</p>
                            <p className="text-ink-muted text-xs mt-0.5">
                              {m.memberId} · {m.residentStatus} · {m.projectName}
                            </p>
                            <p className="text-ink-muted text-xs mt-0.5">Applied: {formatDate(m.createdAt)}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => void approve(m.id)}
                              className="flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs px-4 py-2 rounded-xl transition-colors font-medium"
                            >
                              <CheckCircle size={12} /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => void reject(m.id)}
                              className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs px-4 py-2 rounded-xl transition-colors font-medium"
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h2 className="text-ink-muted text-xs tracking-[2px] uppercase font-semibold mb-3">All Members</h2>
                <div className="bg-white border border-cream-300 rounded-2xl overflow-hidden shadow-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-cream-300 bg-cream-100">
                        {["Name", "Email", "Member ID", "Status", "Project", "Joined"].map((h) => (
                          <th key={h} className="px-5 py-3.5 text-left text-ink-muted text-xs font-semibold tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-200">
                      {members.map((m) => (
                        <tr key={m.id} className="hover:bg-cream-100/60 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-forest-900 flex items-center justify-center text-primary text-xs font-bold">
                                {m.fullName.charAt(0)}
                              </div>
                              <span className="text-forest font-medium">{m.fullName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-ink-light text-xs">{m.email || "—"}</td>
                          <td className="px-5 py-3.5 text-ink-light font-mono text-xs">{m.memberId}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full border capitalize font-medium ${STATUS_STYLES[m.status] ?? ""}`}
                            >
                              {m.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-ink-muted text-xs">{m.projectName}</td>
                          <td className="px-5 py-3.5 text-ink-muted text-xs">{formatDate(m.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "privileges" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-ink-muted text-xs tracking-[2px] uppercase font-semibold">All Privileges</h2>
              <button type="button" className="btn-primary text-xs px-4 py-2">
                + Add Privilege
              </button>
            </div>
            {codeSaveError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                Could not save privilege code: {codeSaveError}
              </div>
            )}
            <p className="text-ink-muted text-xs mb-4 max-w-2xl">
              Privilege code is the plain text encoded in the member redeem QR. Partners scan this value at checkout.
            </p>
            <div className="bg-white border border-cream-300 rounded-2xl overflow-x-auto shadow-card">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b border-cream-300 bg-cream-100">
                    {["Privilege", "Partner", "Privilege code (QR)", "Discount", "Status"].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-ink-muted text-xs font-semibold tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {privileges.map((p) => (
                    <tr key={p.id} className="hover:bg-cream-100/60 transition-colors">
                      <td className="px-5 py-3.5 text-forest font-medium">{p.title}</td>
                      <td className="px-5 py-3.5 text-ink-light">{p.partnerName}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 max-w-xs">
                          <input
                            type="text"
                            value={codeDrafts[p.id] ?? ""}
                            onChange={(e) =>
                              setCodeDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            placeholder="e.g. TTC-BDMS-15"
                            className="flex-1 min-w-0 rounded-lg border border-cream-300 bg-cream-50 px-3 py-1.5 text-xs font-mono text-forest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                          <button
                            type="button"
                            disabled={savingCodeId === p.id}
                            onClick={() => void savePrivilegeCode(p.id)}
                            className="shrink-0 rounded-lg bg-forest-900 px-3 py-1.5 text-xs font-medium text-cream-100 hover:bg-forest-800 disabled:opacity-50 transition-colors"
                          >
                            {savingCodeId === p.id ? "…" : "Save"}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="bg-primary/15 text-primary-dark text-xs font-bold px-2.5 py-1 rounded-lg border border-primary/20">
                          {p.discountLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${
                            p.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
