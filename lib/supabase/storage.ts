import { createClient } from "./client";

export const CLUB_ASSETS_BUCKET = "club-assets";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const MAX_LOGO_BYTES = 1024 * 1024;
const MAX_COVER_BYTES = 1024 * 1024;

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

function mimeFromFilename(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  return ext ? (map[ext] ?? null) : null;
}

function resolveMimeType(file: File): string {
  if (file.type && ALLOWED_IMAGE_TYPES.has(file.type)) return file.type;
  return mimeFromFilename(file.name) ?? file.type;
}

function extensionFor(file: File): string {
  const mime = resolveMimeType(file);
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mime] ?? "jpg";
}

function validateImage(file: File, maxBytes: number, label: string): string | null {
  const mime = resolveMimeType(file);
  if (!ALLOWED_IMAGE_TYPES.has(mime)) {
    return `${label} must be JPEG, PNG, WebP, or GIF.`;
  }
  if (file.size > maxBytes) {
    const maxKb = Math.round(maxBytes / 1024);
    return `${label} must be ${maxKb} KB or smaller.`;
  }
  return null;
}

async function uploadImage(path: string, file: File): Promise<UploadResult> {
  const supabase = createClient();
  const contentType = resolveMimeType(file);
  const { error } = await supabase.storage.from(CLUB_ASSETS_BUCKET).upload(path, file, {
    upsert: true,
    contentType,
    cacheControl: "3600",
  });

  if (error) return { ok: false, error: error.message };

  const { data } = supabase.storage.from(CLUB_ASSETS_BUCKET).getPublicUrl(path);
  const versionedUrl = `${data.publicUrl}?v=${Date.now()}`;
  return { ok: true, url: versionedUrl };
}

export async function uploadPartnerLogo(partnerId: string, file: File): Promise<UploadResult> {
  const validationError = validateImage(file, MAX_LOGO_BYTES, "Logo");
  if (validationError) return { ok: false, error: validationError };

  const path = `logos/${partnerId}.${extensionFor(file)}`;
  return uploadImage(path, file);
}

export async function uploadPrivilegeCover(privilegeId: string, file: File): Promise<UploadResult> {
  const validationError = validateImage(file, MAX_COVER_BYTES, "Cover image");
  if (validationError) return { ok: false, error: validationError };

  const path = `privileges/${privilegeId}.${extensionFor(file)}`;
  return uploadImage(path, file);
}
