export function RaceSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <SkeletonBlock className="h-[88px]" />
      <SkeletonBlock className="h-[60px]" />
      <SkeletonBlock className="h-[88px]" />
      <SkeletonBlock className="h-[56px]" />
      <SkeletonBlock className="h-[120px]" />
      <div className="bento-card overflow-hidden">
        <SkeletonBlock className="h-9 rounded-none" />
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBlock
            key={i}
            className="h-12 rounded-none border-t border-border-subtle"
          />
        ))}
      </div>
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-bg-subtle ${className ?? ""}`}
    >
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  );
}
