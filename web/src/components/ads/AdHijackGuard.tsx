"use client";

import { useEffect } from "react";

/**
 * 防止廣告 script 在用戶沒有互動時自動劫持頁面跳轉或彈窗。
 *
 * 攔截目標：
 * - `window.open(...)` 在沒有最近用戶互動時靜默拒絕
 *
 * 不攔截：
 * - 正常的頁面導航（用戶點 link、表單送出等）
 * - 用戶剛觸發互動後 1.5 秒內的廣告點擊
 */
export function AdHijackGuard() {
  useEffect(() => {
    let lastUserInteraction = 0;
    const USER_GRACE_MS = 1500;

    const markInteraction = () => {
      lastUserInteraction = Date.now();
    };

    const events: Array<keyof DocumentEventMap> = [
      "click",
      "touchstart",
      "keydown",
      "pointerdown",
    ];
    events.forEach((evt) => {
      document.addEventListener(evt, markInteraction, {
        capture: true,
        passive: true,
      });
    });

    // 包裹 window.open — 非用戶互動時拒絕
    const originalOpen = window.open;
    window.open = function (
      url?: string | URL,
      target?: string,
      features?: string,
    ) {
      const sinceInteraction = Date.now() - lastUserInteraction;
      if (sinceInteraction > USER_GRACE_MS) {
        // eslint-disable-next-line no-console
        console.warn("[AdGuard] Blocked auto window.open:", url);
        return null;
      }
      return originalOpen.call(window, url ?? "", target, features);
    };

    return () => {
      events.forEach((evt) => {
        document.removeEventListener(evt, markInteraction, true);
      });
      window.open = originalOpen;
    };
  }, []);

  return null;
}
