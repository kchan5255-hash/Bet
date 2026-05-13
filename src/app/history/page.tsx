import { HistoryDashboard } from "@/components/HistoryDashboard";

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-xs text-text-subtle uppercase tracking-widest mb-2">
          <span className="h-px w-8 bg-border" />
          Historical Performance
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
          歷史記錄
        </h1>
        <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
          追蹤每期四大數據推介的命中表現。輸入實際頭三名馬號，系統將自動計算命中率並呈現走勢。
        </p>
      </header>

      <HistoryDashboard />
    </div>
  );
}
