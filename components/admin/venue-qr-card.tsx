"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const QR_EXPORT_SIZE = 1000;
const QR_PREVIEW_SIZE = 180;

type Props = {
  value: string;
  /** Used in downloaded filename, e.g. event-slug__venue-slug */
  fileBaseName: string;
  title?: string;
  className?: string;
};

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export QR image."));
    }, "image/png");
  });
}

export function VenueQrCard({ value, fileBaseName, title, className }: Props) {
  const exportWrapRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const flash = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2000);
  };

  const getExportCanvas = () =>
    exportWrapRef.current?.querySelector("canvas") ?? null;

  const getPngObjectUrl = async () => {
    const canvas = getExportCanvas();
    if (!canvas) throw new Error("QR not ready");
    const blob = await canvasToPngBlob(canvas);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;
    return url;
  };

  const openInNewTab = async () => {
    try {
      const url = await getPngObjectUrl();
      const tab = window.open(url, "_blank", "noopener,noreferrer");
      if (!tab) {
        flash("Allow pop-ups to open QR");
      }
    } catch {
      flash("Could not open QR");
    }
  };

  const savePng = async () => {
    try {
      const url = await getPngObjectUrl();
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBaseName}-qr.png`;
      a.click();
      flash("Saved");
    } catch {
      flash("Could not save");
    }
  };

  const copyImage = async () => {
    const canvas = getExportCanvas();
    if (!canvas) {
      flash("QR not ready");
      return;
    }
    try {
      const blob = await canvasToPngBlob(canvas);
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        flash("Image copied");
        return;
      }
      await navigator.clipboard.writeText(value);
      flash("Link copied");
    } catch {
      try {
        await navigator.clipboard.writeText(value);
        flash("Link copied");
      } catch {
        flash("Could not copy");
      }
    }
  };

  return (
    <>
      <div ref={exportWrapRef} className="sr-only" aria-hidden>
        <QRCodeCanvas
          value={value}
          size={QR_EXPORT_SIZE}
          level="M"
          includeMargin
          fgColor="#0A1F14"
          bgColor="#FFFFFF"
        />
      </div>

      <div className={cn("shrink-0 w-fit mx-auto sm:mx-0", className)}>
        <button
          type="button"
          onClick={() => void openInNewTab()}
          className="group rounded-2xl border border-cream-300 bg-cream-50 p-3 text-left transition-colors hover:border-primary/40 hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          title={title ? `Open ${title} QR in new tab` : "Open QR in new tab"}
        >
          <div className="relative bg-white rounded-xl p-2">
            <QRCodeCanvas
              value={value}
              size={QR_PREVIEW_SIZE}
              level="M"
              includeMargin
              fgColor="#0A1F14"
              bgColor="#FFFFFF"
            />
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-forest-900/80 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              <ExternalLink size={10} /> Open
            </span>
          </div>
        </button>
        <div className="mt-2 flex flex-wrap gap-1.5 justify-center sm:justify-start">
          <button
            type="button"
            onClick={() => void openInNewTab()}
            className="inline-flex items-center gap-1 rounded-lg border border-cream-300 bg-white px-2 py-1 text-[11px] text-forest hover:bg-cream-100"
          >
            <ExternalLink size={11} /> Open
          </button>
          <button
            type="button"
            onClick={() => void savePng()}
            className="inline-flex items-center gap-1 rounded-lg border border-cream-300 bg-white px-2 py-1 text-[11px] text-forest hover:bg-cream-100"
          >
            <Download size={11} /> Save
          </button>
          <button
            type="button"
            onClick={() => void copyImage()}
            className="inline-flex items-center gap-1 rounded-lg border border-cream-300 bg-white px-2 py-1 text-[11px] text-forest hover:bg-cream-100"
          >
            <Copy size={11} /> Copy image
          </button>
        </div>
        {notice && (
          <p className="text-[10px] text-emerald-700 text-center sm:text-left mt-1">{notice}</p>
        )}
      </div>
    </>
  );
}
