"use client";

import { useEffect, useState } from "react";
import type { CommunityMoment } from "@/lib/types";
import { fetchPublishedCommunity } from "@/lib/supabase/data";
import { formatDate } from "@/lib/utils";
import { X } from "lucide-react";

export default function CommunityPage() {
  const [items, setItems] = useState<CommunityMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CommunityMoment | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await fetchPublishedCommunity();
      if (!cancelled) {
        setItems(rows.sort((a, b) => a.sortOrder - b.sortOrder));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto flex justify-center py-24">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <h1 className="text-2xl font-light text-forest mb-1">Community Moments</h1>
      <p className="text-ink-muted text-sm mb-8">Events, gatherings, and memories shared by THE TITLE family</p>

      <div className="columns-2 md:columns-3 gap-4 space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelected(item)}
            className="break-inside-avoid group relative overflow-hidden rounded-2xl cursor-pointer border border-cream-300 shadow-card"
          >
            <img
              src={item.imageUrl}
              alt={item.caption}
              className="w-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-forest-900/65 to-transparent
                            opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4"
            >
              <p className="text-white text-sm font-medium">{item.caption}</p>
              <p className="text-white/50 text-xs mt-1">{formatDate(item.eventDate)}</p>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-forest-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setSelected(null)}
        >
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={selected.imageUrl}
              alt={selected.caption}
              className="w-full rounded-2xl shadow-2xl border border-white/10"
            />
            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="text-white font-medium">{selected.caption}</p>
                <p className="text-white/40 text-sm mt-0.5">{formatDate(selected.eventDate)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-white/40 hover:text-white w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
