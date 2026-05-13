"use client";

import { useEffect, useState } from "react";

const KEY = "furlong_demo_pro";

export function useSubscription() {
  const [isPro, setPro] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    setPro(stored === "1");
    setReady(true);
  }, []);

  const toggle = (value: boolean) => {
    setPro(value);
    window.localStorage.setItem(KEY, value ? "1" : "0");
  };

  return { isPro, ready, toggle };
}
