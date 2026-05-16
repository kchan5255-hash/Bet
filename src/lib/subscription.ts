"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "furlong:demo-pro";

export function useSubscription() {
  const [isPro, setIsPro] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "0") setIsPro(false);
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  function toggle(next: boolean) {
    setIsPro(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }

  return { isPro, ready, toggle };
}
