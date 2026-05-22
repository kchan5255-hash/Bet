import { cn } from "@/lib/utils";

interface RecommendChipProps {
  no: string;
  name?: string;
  variant?: "solid" | "outline" | "ghost";
}

export function RecommendChip({
  no,
  name,
  variant = "outline",
}: RecommendChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs",
        variant === "solid" && "ai-gradient font-bold text-white",
        variant === "outline" &&
          "border border-precision/40 bg-precision/10 text-precision-glow",
        variant === "ghost" &&
          "border border-border-subtle bg-bg-subtle text-text",
      )}
    >
      <span className="number-mono font-bold">#{no}</span>
      {name && <span>{name}</span>}
    </span>
  );
}

interface RecommendChipListProps {
  items: { no: string; name?: string }[];
  variant?: "solid" | "outline" | "ghost";
  className?: string;
}

export function RecommendChipList({
  items,
  variant = "outline",
  className,
}: RecommendChipListProps) {
  if (items.length === 0) return null;
  return (
    <span className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((item) => (
        <RecommendChip key={item.no} no={item.no} name={item.name} variant={variant} />
      ))}
    </span>
  );
}
