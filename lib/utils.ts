import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

import type { PrivilegeCategory } from "@/lib/types";

export function categoryLabel(cat: Pick<PrivilegeCategory, "label">): string {
  return cat.label;
}

export function categoryColor(cat: Pick<PrivilegeCategory, "color">): string {
  return cat.color;
}

/** Admin lists: active first, then newest created first within each group. */
export function sortAdminByActiveThenCreated<
  T extends { isActive: boolean; createdAt?: string },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}
