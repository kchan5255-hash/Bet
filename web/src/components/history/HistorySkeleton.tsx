export function HistorySkeleton() {
  return (
    <div className="space-y-5 md:space-y-7" aria-busy="true" aria-live="polite">
      <span className="sr-only">歷史紀錄載入中</span>

      <div className="bento-card animate-shimmer h-[260px] md:h-[280px]" />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-subtle bg-bg-card animate-shimmer h-[88px] md:h-[100px]"
          />
        ))}
      </div>

      <div className="bento-card animate-shimmer h-[320px]" />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-subtle bg-bg-card animate-shimmer h-[88px] md:h-[100px]"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bento-card animate-shimmer h-[200px] md:h-[240px]"
          />
        ))}
      </div>
    </div>
  );
}
