"use client";

import { cn } from "@/lib/utils";

interface FilterChipProps {
  pressed: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
  glyph?: React.ReactNode;
}

export function FilterChip({ pressed, onClick, label, hint, glyph }: FilterChipProps) {
  return (
    <button
      type="button"
      role="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai-start/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        pressed
          ? "border-ai-start/50 bg-gradient-to-r from-ai-start/25 to-ai-end/15 text-text shadow-[0_0_10px_rgba(99,102,241,0.25)]"
          : "border-border-subtle bg-bg-subtle/60 text-text-muted hover:text-text hover:border-border",
      )}
    >
      {glyph}
      <span>{label}</span>
      {hint && (
        <span className="text-[10px] opacity-70 number-mono">{hint}</span>
      )}
    </button>
  );
}
