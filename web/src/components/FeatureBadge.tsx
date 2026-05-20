import { cn } from "@/lib/utils";
import { POSITIVE_LABELS, NEGATIVE_LABELS } from "@/lib/types";

interface FeatureBadgeProps {
  label: string;
  kind: "positive" | "negative";
}

export function FeatureBadge({ label, kind }: FeatureBadgeProps) {
  const text =
    kind === "positive"
      ? POSITIVE_LABELS[label] ?? label
      : NEGATIVE_LABELS[label] ?? label;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        kind === "positive"
          ? "border-precision/30 bg-precision/10 text-precision"
          : "border-danger/30 bg-danger/10 text-danger",
      )}
    >
      {text}
    </span>
  );
}
