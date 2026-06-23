/** Parse promo codes from pasted text (one code per line). */
export function parseCodesFromText(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const code = line.trim();
    if (!code) continue;
    const key = code.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(code);
  }

  return result;
}

/** Parse promo codes from Excel/CSV file (first column of first sheet). */
export async function parseCodesFromFile(file: File): Promise<string[]> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "csv" || ext === "txt") {
    const text = await file.text();
    return parseCodesFromText(text);
  }

  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
    const codes: string[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      const raw = Array.isArray(row) ? row[0] : "";
      const code = String(raw ?? "").trim();
      if (!code || code.toLowerCase() === "code" || code.toLowerCase() === "promo code") continue;
      const key = code.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      codes.push(code);
    }

    return codes;
  }

  throw new Error("Unsupported file type. Use .xlsx, .xls, .csv, or .txt");
}

/** Format remaining time until expiry as HH:MM:SS */
export function formatCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "00:00:00";
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1_000);
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}
