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

export function categoryLabel(cat: string) {
  return {
    health: "Health & Wellness",
    fnb: "F&B",
    service: "Service",
    lifestyle: "Lifestyle",
  }[cat] ?? cat;
}

export function categoryColor(cat: string) {
  return {
    health:    "bg-emerald-900/40 text-emerald-400 border-emerald-700/40",
    fnb:       "bg-amber-900/40 text-amber-400 border-amber-700/40",
    service:   "bg-sky-900/40 text-sky-400 border-sky-700/40",
    lifestyle: "bg-purple-900/40 text-purple-400 border-purple-700/40",
  }[cat] ?? "bg-gray-900/40 text-gray-400 border-gray-700/40";
}
