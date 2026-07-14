"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  hint?: string;
  currentUrl?: string;
  accept?: string;
  maxSizeBytes?: number;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
};

export function ImageUploadField({
  label,
  hint,
  currentUrl,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  maxSizeBytes = 1024 * 1024,
  disabled,
  onFileChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const displayUrl = preview ?? (selectedFile ? null : currentUrl) ?? null;

  const handleFile = (file: File | null) => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setLocalError(null);

    if (file) {
      const allowed = accept.split(",").map((t) => t.trim());
      const typeOk = !file.type || allowed.includes(file.type);
      if (!typeOk) {
        setLocalError("Please choose a JPEG, PNG, WebP, or GIF image.");
        onFileChange(null);
        setSelectedFile(null);
        setPreview(null);
        return;
      }
      if (file.size > maxSizeBytes) {
        setLocalError(`Image must be ${Math.round(maxSizeBytes / 1024)} KB or smaller.`);
        onFileChange(null);
        setSelectedFile(null);
        setPreview(null);
        return;
      }
    }

    setSelectedFile(file);
    onFileChange(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  const clearSelection = () => {
    handleFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="block">
      <span className="text-ink-muted text-xs font-semibold uppercase tracking-wide">{label}</span>
      {hint && <p className="text-ink-muted text-[11px] mt-0.5">{hint}</p>}

      <div className="mt-2 flex flex-col gap-4 items-start">
        <div
          className={cn(
            "w-3/5 h-auto rounded-xl border border-cream-300 bg-cream-100 flex items-center justify-center overflow-hidden shrink-0",
            !displayUrl && "border-dashed"
          )}
        >
          {displayUrl ? (
            <img src={displayUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus size={22} className="text-ink-muted" strokeWidth={1.25} />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            disabled={disabled}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              handleFile(file);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-cream-300 bg-white px-3 py-1.5 text-xs font-medium text-forest hover:bg-cream-50 disabled:opacity-50"
            >
              {displayUrl ? "Change image" : "Upload image"}
            </button>
            {selectedFile && (
              <button
                type="button"
                disabled={disabled}
                onClick={clearSelection}
                className="inline-flex items-center gap-1 rounded-lg border border-cream-300 px-3 py-1.5 text-xs text-ink-muted hover:bg-cream-50 disabled:opacity-50"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
          {selectedFile && (
            <p className="text-[11px] text-ink-muted truncate">
              {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
            </p>
          )}
          {localError && <p className="text-[11px] text-red-700">{localError}</p>}
        </div>
      </div>
    </div>
  );
}
