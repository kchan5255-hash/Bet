"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const STORAGE_KEY = "furlong:age-warning-acknowledged";

export function AgeWarningBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) !== "1") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alertdialog"
      aria-labelledby="age-warning-title"
      aria-describedby="age-warning-desc"
      className="sticky top-0 z-50 border-b border-warning/30 bg-warning/10 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2.5 md:px-6">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-warning"
          aria-hidden
        />
        <div className="flex-1 text-[12px] leading-relaxed">
          <p id="age-warning-title" className="font-bold text-text">
            18+ 內容警示
          </p>
          <p id="age-warning-desc" className="mt-0.5 text-text-muted">
            本網站僅供 18 歲或以上人士閱覽，內容涉及賽馬投注分析。
            投注有風險，請理性投注。詳情請參閱{" "}
            <a
              href="/disclaimer"
              className="text-precision-glow underline underline-offset-2 hover:opacity-80"
            >
              免責聲明
            </a>
            。求助熱線：
            <a
              href="tel:18346330"
              className="number-mono text-precision-glow underline underline-offset-2 hover:opacity-80"
            >
              1834 633
            </a>
            。
          </p>
        </div>
        <button
          type="button"
          aria-label="我已年滿 18 歲，關閉警示"
          onClick={() => {
            try {
              sessionStorage.setItem(STORAGE_KEY, "1");
            } catch {
              /* ignore */
            }
            setVisible(false);
          }}
          className="shrink-0 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-text transition-colors hover:bg-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/60"
        >
          <span className="hidden md:inline">我已年滿 18 歲</span>
          <X className="md:hidden h-3 w-3" aria-hidden />
        </button>
      </div>
    </div>
  );
}
