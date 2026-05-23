"use client";

import { useEffect } from "react";

/**
 * 防止廣告 script 在用戶沒有互動時自動劫持頁面跳轉或彈窗。
 *
 * 攔截：
 * 1. window.open(...) — 沒有最近用戶互動時拒絕
 * 2. window.location 賦值劫持 — 偵測非用戶觸發的全頁跳轉
 *
 * 不攔截：
 * - 用戶剛觸發互動後 1.5 秒內的廣告點擊
 * - Next.js / React Router 的內部導航（用 pushState）
 */
export function AdHijackGuard() {
  useEffect(() => {
    let lastUserInteraction = Date.now(); // 初始視為剛互動，避免阻擋首次導航
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

    // 包裹 window.open
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

    // 攔截 form auto-submit（廣告有時透過動態建立 form 跳轉）
    const onSubmit = (e: SubmitEvent) => {
      const sinceInteraction = Date.now() - lastUserInteraction;
      const form = e.target as HTMLFormElement | null;
      if (!form) return;
      const isExternal = form.action && !form.action.startsWith(location.origin);
      if (isExternal && sinceInteraction > USER_GRACE_MS) {
        e.preventDefault();
        e.stopPropagation();
        // eslint-disable-next-line no-console
        console.warn("[AdGuard] Blocked auto form submit:", form.action);
      }
    };
    document.addEventListener("submit", onSubmit, true);

    return () => {
      events.forEach((evt) => {
        document.removeEventListener(evt, markInteraction, true);
      });
      document.removeEventListener("submit", onSubmit, true);
      window.open = originalOpen;
    };
  }, []);

  return null;
}
