"use client";

export function useSubscription() {
  return { isPro: false, ready: true, toggle: (_next: boolean) => {} };
}
