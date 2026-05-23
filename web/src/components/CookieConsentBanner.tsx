"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "furlong:cookie-consent-acknowledged";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "1") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const acknowledge = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl rounded-xl border border-border bg-bg-elevated/95 backdrop-blur-md shadow-lg shadow-black/40 md:inset-x-auto md:left-1/2 md:-translate-x-1/2"
    >
      <div className="flex items-start gap-3 p-3 md:p-4">
        <Cookie
          className="mt-0.5 h-4 w-4 shrink-0 text-precision-glow"
          aria-hidden
        />
        <div className="flex-1 text-[12px] leading-relaxed">
          <p id="cookie-consent-title" className="font-bold text-text">
            Cookie 與廣告偏好
          </p>
          <p id="cookie-consent-desc" className="mt-1 text-text-muted">
            本網站使用 Cookie 維持登入狀態、記錄偏好設定，並透過 Google AdSense
            等第三方服務投放個人化廣告。繼續瀏覽即視為同意。詳情請參閱{" "}
            <Link
              href="/privacy"
              className="text-precision-glow underline underline-offset-2 hover:opacity-80"
            >
              私隱政策
            </Link>
            。
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-1.5 md:flex-row md:items-center">
          <button
            type="button"
            onClick={acknowledge}
            className="rounded-md bg-precision-glow px-3 py-1.5 text-[11px] font-semibold text-bg-base hover:opacity-90"
          >
            我已了解
          </button>
          <button
            type="button"
            aria-label="關閉"
            onClick={acknowledge}
            className="hidden md:inline-flex h-7 w-7 items-center justify-center rounded text-text-subtle hover:bg-bg-subtle hover:text-text"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
