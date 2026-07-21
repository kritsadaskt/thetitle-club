"use client";

import { cn } from "@/lib/utils";

type ActiveToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  label?: string;
};

export function ActiveToggle({
  checked,
  onChange,
  className,
  label = "Active",
}: ActiveToggleProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          checked ? "bg-primary" : "bg-cream-300"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </button>
      <span className="text-sm text-forest">{label}</span>
    </div>
  );
}
