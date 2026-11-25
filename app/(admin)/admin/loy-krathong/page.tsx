"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Download,
  RefreshCw,
} from "lucide-react";
import { VenueQrCard } from "@/components/admin/venue-qr-card";
import { absoluteAppUrl } from "@/lib/app-url";
import { useAuth } from "@/lib/auth-context";
import { localizedLoginPath } from "@/lib/i18n";
import {
  FEEDBACK_SECTIONS,
  LOY_KRATHONG_LOCATIONS,
  SECTION_LABELS_EN,
  SIDE_LABELS_EN,
  countSelections,
  feedbackPublicPath,
  formatOptionList,
  type FeedbackSection,
  type FeedbackSide,
  type LoyKrathongFeedbackRow,
  type LoyKrathongLocationSlug,
} from "@/lib/loy-krathong-feedback";
import { fetchLoyKrathongFeedback } from "@/lib/supabase/data";
import { cn, formatDate } from "@/lib/utils";

type Filter = "all" | LoyKrathongLocationSlug;

function locationLabel(slug: string) {
  return LOY_KRATHONG_LOCATIONS.find((l) => l.slug === slug)?.name ?? slug;
}

function MaxBar({ count, max }: { count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-cream-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-forest w-8 text-right">{count}</span>
    </div>
  );
}

export default function LoyKrathongAdminPage() {
  const { isAdmin, isLoading, logout } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<LoyKrathongFeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async ({ showSpinner = true }: { showSpinner?: boolean } = {}) => {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    setError(null);
    const res = await fetchLoyKrathongFeedback("all");
    if (res.error) {
      setError(res.error);
      setRows([]);
    } else {
      setRows(res.rows);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAdmin) router.replace(localizedLoginPath());
  }, [isAdmin, isLoading, router]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.locationSlug === filter);
  }, [rows, filter]);

  const lastSubmitted = filtered[0]?.submittedAt ?? null;

  const byLocationCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const loc of LOY_KRATHONG_LOCATIONS) map.set(loc.slug, 0);
    for (const row of rows) {
      map.set(row.locationSlug, (map.get(row.locationSlug) ?? 0) + 1);
    }
    return map;
  }, [rows]);

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const header = [
      "Location",
      "Locale",
      "Submitted at",
      "Food positive",
      "Food positive other",
      "Food improve",
      "Food improve other",
      "Venue positive",
      "Venue positive other",
      "Venue improve",
      "Venue improve other",
      "Activities positive",
      "Activities positive other",
      "Activities improve",
      "Activities improve other",
    ];
    const sheetRows = filtered.map((row) => [
      locationLabel(row.locationSlug),
      row.locale,
      row.submittedAt,
      formatOptionList("food", "positive", row.foodPositive),
      row.foodPositiveOther ?? "",
      formatOptionList("food", "improve", row.foodImprove),
      row.foodImproveOther ?? "",
      formatOptionList("venue", "positive", row.venuePositive),
      row.venuePositiveOther ?? "",
      formatOptionList("venue", "improve", row.venueImprove),
      row.venueImproveOther ?? "",
      formatOptionList("activities", "positive", row.activitiesPositive),
      row.activitiesPositiveOther ?? "",
      formatOptionList("activities", "improve", row.activitiesImprove),
      row.activitiesImproveOther ?? "",
    ]);

    const summaryHeader = ["Location", "Section", "Side", "Option", "Count", "Share %"];
    const summaryRows: (string | number)[][] = [];
    const locationsForSummary =
      filter === "all"
        ? [...LOY_KRATHONG_LOCATIONS.map((l) => l.slug)]
        : [filter];

    for (const locSlug of locationsForSummary) {
      const locRows = rows.filter((r) => r.locationSlug === locSlug);
      const total = locRows.length;
      for (const section of FEEDBACK_SECTIONS) {
        for (const side of ["positive", "improve"] as FeedbackSide[]) {
          const counts = countSelections(locRows, section.id, side);
          for (const item of counts) {
            summaryRows.push([
              locationLabel(locSlug),
              SECTION_LABELS_EN[section.id],
              SIDE_LABELS_EN[side],
              item.label,
              item.count,
              total ? Math.round((item.count / total) * 1000) / 10 : 0,
            ]);
          }
        }
      }
    }

    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([header, ...sheetRows]),
      "Responses"
    );
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([summaryHeader, ...summaryRows]),
      "Summary"
    );
    const suffix = filter === "all" ? "all" : filter;
    XLSX.writeFile(book, `loy-krathong-2026-feedback__${suffix}.xlsx`);
  };

  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100">
      <header
        className="bg-deep-blue px-6 py-5"
        style={{ backgroundImage: "url('/club/club-bg.webp')" }}
      >
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-eyebrow text-primary">Standalone</p>
            <h1 className="text-cream text-xl font-light mt-1">
              Loy Krathong 2026 Feedback
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs text-cream/80 hover:bg-white/10"
            >
              <ArrowLeft size={14} />
              Main admin
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-cream/80 hover:bg-white/10"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 bg-white border border-cream-300 rounded-xl p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                filter === "all"
                  ? "bg-forest-900 text-cream-100"
                  : "text-ink-light hover:text-forest"
              )}
            >
              All ({rows.length})
            </button>
            {LOY_KRATHONG_LOCATIONS.map((loc) => (
              <button
                key={loc.slug}
                type="button"
                onClick={() => setFilter(loc.slug)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  filter === loc.slug
                    ? "bg-forest-900 text-cream-100"
                    : "text-ink-light hover:text-forest"
                )}
              >
                {loc.name.replace(/^The Title /i, "")} ({byLocationCounts.get(loc.slug) ?? 0})
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load({ showSpinner: false })}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-cream-300 bg-white px-3 py-2 text-xs font-medium text-forest hover:bg-cream-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void exportExcel()}
              disabled={filtered.length === 0}
              className="btn btn-primary inline-flex items-center gap-2 !px-4 !py-2 text-sm"
            >
              <Download size={15} />
              Export Excel
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white border border-cream-300 rounded-2xl p-5 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-forest-50 text-forest-700">
                <ClipboardList size={15} strokeWidth={1.5} />
              </div>
              <span className="text-ink-muted text-xs font-medium">Responses</span>
            </div>
            <p className="text-3xl font-light text-forest">{filtered.length}</p>
          </div>
          <div className="bg-white border border-cream-300 rounded-2xl p-5 shadow-card col-span-2 md:col-span-1">
            <span className="text-ink-muted text-xs font-medium">Latest submission</span>
            <p className="text-sm text-forest mt-3">
              {lastSubmitted ? formatDate(lastSubmitted) : "—"}
            </p>
          </div>
          <div className="bg-white border border-cream-300 rounded-2xl p-5 shadow-card col-span-2 md:col-span-1">
            <span className="text-ink-muted text-xs font-medium">Filter</span>
            <p className="text-sm text-forest mt-3">
              {filter === "all" ? "All locations" : locationLabel(filter)}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <section className="space-y-6">
              <h2 className="text-forest font-semibold text-lg">Summary</h2>
              {FEEDBACK_SECTIONS.map((section) => (
                <div key={section.id} className="card p-5 space-y-4">
                  <h3 className="text-forest font-semibold">
                    {SECTION_LABELS_EN[section.id as FeedbackSection]}
                  </h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    {(["positive", "improve"] as FeedbackSide[]).map((side) => {
                      const items = countSelections(filtered, section.id, side);
                      const max = Math.max(1, ...items.map((i) => i.count));
                      return (
                        <div key={side} className="space-y-3">
                          <p className="text-xs font-semibold tracking-[2px] uppercase text-ink-muted">
                            {SIDE_LABELS_EN[side]}
                          </p>
                          <ul className="space-y-2.5">
                            {items.map((item) => (
                              <li key={item.id}>
                                <div className="flex justify-between gap-2 mb-1">
                                  <span className="text-sm text-ink">{item.label}</span>
                                </div>
                                <MaxBar count={item.count} max={max} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-4">
              <h2 className="text-forest font-semibold text-lg">QR codes (English links)</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {LOY_KRATHONG_LOCATIONS.map((loc) => {
                  const path = feedbackPublicPath(loc.slug, "en");
                  const url = absoluteAppUrl(path);
                  return (
                    <div
                      key={loc.slug}
                      className="card p-4 space-y-3 flex flex-col items-center text-center"
                    >
                      <p className="text-sm font-semibold text-forest">{loc.name}</p>
                      <p className="text-[10px] text-ink-muted break-all">{url}</p>
                      <VenueQrCard
                        value={url}
                        title={loc.name}
                        fileBaseName={`loy-krathong-2026__${loc.slug}`}
                      />
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-forest font-semibold text-lg">
                Recent responses ({filtered.length})
              </h2>
              {filtered.length === 0 ? (
                <div className="card p-8 text-center text-sm text-ink-muted">
                  No responses yet for this filter.
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-cream-50 border-b border-cream-300 text-xs uppercase tracking-wide text-ink-muted">
                        <tr>
                          <th className="px-4 py-3 font-medium">Submitted</th>
                          <th className="px-4 py-3 font-medium">Location</th>
                          <th className="px-4 py-3 font-medium">Locale</th>
                          <th className="px-4 py-3 font-medium">Selections</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.slice(0, 50).map((row) => {
                          const n =
                            row.foodPositive.length +
                            row.foodImprove.length +
                            row.venuePositive.length +
                            row.venueImprove.length +
                            row.activitiesPositive.length +
                            row.activitiesImprove.length;
                          return (
                            <tr key={row.id} className="border-b border-cream-200 last:border-0">
                              <td className="px-4 py-3 text-ink whitespace-nowrap">
                                {formatDate(row.submittedAt)}
                              </td>
                              <td className="px-4 py-3 text-ink">
                                {locationLabel(row.locationSlug)}
                              </td>
                              <td className="px-4 py-3 text-ink uppercase">{row.locale}</td>
                              <td className="px-4 py-3 text-ink-muted">{n} options</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {filtered.length > 50 && (
                    <p className="text-xs text-ink-muted px-4 py-3 border-t border-cream-200">
                      Showing latest 50. Export Excel for the full list.
                    </p>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
