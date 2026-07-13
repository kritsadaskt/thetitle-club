"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { fetchAllPartners, fetchAllPrivileges } from "@/lib/supabase/data";
import { mapProfileToMember, type ProfileRow } from "@/lib/supabase/mappers";
import type { Member } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Users, Gift, CheckCircle, XCircle, Clock, LogOut, ArrowLeft, Building2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PartnersTab } from "@/components/admin/partners-tab";
import { CategoriesTab } from "@/components/admin/categories-tab";

type Tab = "members" | "partners" | "categories";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
  pending_verification: "bg-sky-50 text-sky-700 border-sky-200",
  suspended: "bg-red-50 text-red-600 border-red-200",
  rejected: "bg-gray-100 text-gray-500 border-gray-200",
};

function isPendingReview(member: Member) {
  return (
    !member.isAdmin &&
    (member.status === "pending_approval" || member.status === "pending_verification")
  );
}

export default function AdminPage() {
  const { isAdmin, logout, isLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("members");
  const [members, setMembers] = useState<Member[]>([]);
  const [partnerCount, setPartnerCount] = useState(0);
  const [activePrivilegeCount, setActivePrivilegeCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async ({ showSpinner = true }: { showSpinner?: boolean } = {}) => {
    const supabase = createClient();
    if (showSpinner) setDataLoading(true);
    else setRefreshing(true);
    setLoadError(null);
    const [mRes, partners, privs] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      fetchAllPartners(),
      fetchAllPrivileges(),
    ]);
    if (mRes.error) {
      setLoadError(mRes.error.message);
      setMembers([]);
    } else if (mRes.data) {
      setMembers(mRes.data.map((row) => mapProfileToMember(row as ProfileRow, "")));
    }
    setPartnerCount(partners.length);
    setActivePrivilegeCount(privs.filter((p) => p.isActive).length);
    setDataLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAdmin) router.replace("/login");
  }, [isAdmin, isLoading, router]);

  useEffect(() => {
    if (isAdmin) void loadData();
  }, [isAdmin, loadData]);

  useEffect(() => {
    if (!isAdmin) return;
    const onFocus = () => void loadData({ showSpinner: false });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isAdmin, loadData]);

  const approve = async (memberId: string) => {
    setActionError(null);
    setApprovingId(memberId);
    try {
      const res = await fetch(`/club/api/members/${memberId}/approve`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string; emailSent?: boolean; emailError?: string }
        | null;

      if (!res.ok) {
        setActionError(body?.error ?? "Could not approve member.");
        return;
      }

      if (body?.emailError) {
        setActionError(
          `Member approved, but welcome email was not sent: ${body.emailError}`
        );
      }

      await loadData();
    } catch {
      setActionError("Could not approve member. Please try again.");
    } finally {
      setApprovingId(null);
    }
  };

  const reject = async (memberId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ status: "rejected" }).eq("id", memberId);
    if (!error) await loadData({ showSpinner: false });
  };

  const reopenForReview = async (memberId: string) => {
    setActionError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        status: "pending_approval",
        approved_at: null,
        approved_by: null,
      })
      .eq("id", memberId);
    if (error) {
      setActionError(error.message);
      return;
    }
    await loadData({ showSpinner: false });
  };

  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const pending = members.filter(isPendingReview);
  const active = members.filter((m) => m.status === "active");

  const memberActions = (m: Member) => {
    if (m.isAdmin) return null;
    if (isPendingReview(m)) {
      return (
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => void approve(m.id)}
            disabled={approvingId === m.id}
            className="flex items-center gap-1 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 text-xs px-3 py-1.5 rounded-lg font-medium"
          >
            <CheckCircle size={11} />
            {approvingId === m.id ? "…" : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => void reject(m.id)}
            className="flex items-center gap-1 border border-red-200 text-red-600 hover:bg-red-50 text-xs px-3 py-1.5 rounded-lg font-medium"
          >
            <XCircle size={11} /> Reject
          </button>
        </div>
      );
    }
    if (m.status === "active") {
      return (
        <button
          type="button"
          onClick={() => void reopenForReview(m.id)}
          className="text-xs text-amber-700 hover:text-amber-900 border border-amber-200 hover:bg-amber-50 px-3 py-1.5 rounded-lg font-medium"
        >
          Reopen review
        </button>
      );
    }
    return null;
  };

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
        {actionError && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {actionError}
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
            { label: "Partners", value: partnerCount, icon: Building2, color: "bg-sky-50 text-sky-700" },
            { label: "Privileges Active", value: activePrivilegeCount, icon: Gift, color: "bg-primary/10 text-primary-dark" },
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
          {(["members", "partners", "categories"] as Tab[]).map((t) => (
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
                              disabled={approvingId === m.id}
                              className="flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-xs px-4 py-2 rounded-xl transition-colors font-medium"
                            >
                              <CheckCircle size={12} />
                              {approvingId === m.id ? "Approving…" : "Approve"}
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

                <h2 className="text-ink-muted text-xs tracking-[2px] uppercase font-semibold mb-3 flex items-center justify-between">
                  <span>All Members</span>
                  <button
                    type="button"
                    onClick={() => void loadData({ showSpinner: false })}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 text-ink-muted hover:text-forest normal-case tracking-normal font-medium text-xs disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                    Refresh
                  </button>
                </h2>
                <div className="bg-white border border-cream-300 rounded-2xl overflow-hidden shadow-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-cream-300 bg-cream-100">
                        {["Name", "Email", "Member ID", "Status", "Project", "Joined", "Actions"].map((h) => (
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
                          <td className="px-5 py-3.5">{memberActions(m)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "partners" && <PartnersTab />}

        {tab === "categories" && <CategoriesTab />}
      </div>
    </div>
  );
}
