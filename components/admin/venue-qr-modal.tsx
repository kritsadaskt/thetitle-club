"use client";

import { absoluteAppUrl } from "@/lib/app-url";
import { VenueQrCard } from "./venue-qr-card";

type Props = {
  open: boolean;
  title: string;
  /** App path without locale, e.g. /events/slug/venue */
  path: string;
  fileBaseName: string;
  onClose: () => void;
};

export function VenueQrModal({ open, title, path, fileBaseName, onClose }: Props) {
  if (!open) return null;

  const url = absoluteAppUrl(path);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-cream-300 shadow-2xl w-full max-w-sm p-5"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="text-forest font-semibold text-base">{title}</h3>
            <p className="text-[11px] text-ink-muted mt-1 break-all">{url}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-ink-muted hover:bg-cream-100 hover:text-forest"
          >
            Close
          </button>
        </div>
        <VenueQrCard value={url} title={title} fileBaseName={fileBaseName} className="mx-auto" />
        <p className="text-[10px] text-ink-muted mt-3 text-center">
          Open 1000×1000, save PNG, or copy image for print.
        </p>
      </div>
    </div>
  );
}
