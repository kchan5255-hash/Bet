"use client";

export function useSubscription() {
  return {
    isPro: true,
    ready: true,
    toggle: (_value: boolean) => {},
  };
}
