"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCK_PRIVILEGES } from "@/lib/mock-data";
import { PrivilegeCategory } from "@/lib/types";
import { categoryLabel, categoryColor } from "@/lib/utils";
import { ChevronRight, Search } from "lucide-react";

const ALL_CATS: (PrivilegeCategory | "all")[] = ["all", "health", "lifestyle", "service", "fnb"];

export default function PrivilegesPage() {
  const [cat, setCat]     = useState<PrivilegeCategory | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = MOCK_PRIVILEGES.filter((p) => {
    if (!p.isActive) return false;
    if (cat !== "all" && p.category !== cat) return false;
    if (query && !p.title.toLowerCase().includes(query.toLowerCase()) &&
        !p.partnerName.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <h1 className="text-2xl font-light text-forest mb-1">Exclusive Privileges</h1>
      <p className="text-ink-muted text-sm mb-8">
        {MOCK_PRIVILEGES.filter((p) => p.isActive).length} benefits available for THE TITLE CLUB members
      </p>

      {/* ── Search + Filter ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input-field pl-10" placeholder="Search privileges or partners..."
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {ALL_CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-4 py-2.5 rounded-xl text-xs whitespace-nowrap transition-all border font-medium ${
                cat === c
                  ? "bg-forest-900 text-cream-100 border-forest-900"
                  : "border-cream-300 text-ink-light bg-white hover:border-forest-300 hover:text-forest shadow-sm"
              }`}>
              {c === "all" ? "All" : categoryLabel(c)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-ink-muted">No privileges found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((priv) => (
            <Link key={priv.id} href={`/privileges/${priv.id}`}
              className="group bg-white border border-cream-300 rounded-2xl overflow-hidden card-hover shadow-card flex flex-col">
              {/* Cover */}
              <div className="relative h-44 overflow-hidden flex-shrink-0">
                <img src={priv.coverImage} alt={priv.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-900/50 to-transparent" />
                <span className="absolute top-3 right-3 bg-gold text-forest-900 text-xs font-bold px-3 py-1 rounded-full shadow-gold-sm">
                  {priv.discountLabel}
                </span>
                <span className={`absolute bottom-3 left-3 text-xs px-2 py-0.5 rounded border ${categoryColor(priv.category)}`}>
                  {categoryLabel(priv.category)}
                </span>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <img src={priv.partnerLogo} alt={priv.partnerName}
                    className="w-14 h-9 object-contain bg-cream-200 rounded-lg p-1 flex-shrink-0" />
                  <div>
                    <p className="text-ink-muted text-xs">{priv.partnerName}</p>
                    <p className="text-forest font-semibold text-sm">{priv.title}</p>
                  </div>
                </div>
                <p className="text-ink-light text-sm flex-1 leading-relaxed">{priv.summary}</p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-cream-300">
                  {priv.validUntil && (
                    <p className="text-ink-muted text-xs">Until {priv.validUntil}</p>
                  )}
                  <span className="text-gold-dark text-xs flex items-center gap-1 font-medium ml-auto group-hover:text-gold transition-colors">
                    Redeem <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
