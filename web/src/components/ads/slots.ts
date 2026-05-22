export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

export type AdFormat = "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";

export interface AdSenseConfig {
  adSenseSlot: string;
  format: AdFormat;
  layoutKey?: string;
  fullWidthResponsive?: boolean;
}

export const AD_SLOTS: Record<string, AdSenseConfig> = {
  "home-hero-leaderboard": {
    adSenseSlot: "",
    format: "auto",
    fullWidthResponsive: true,
  },
  "home-bento-native": {
    adSenseSlot: "",
    format: "fluid",
    layoutKey: "",
  },
  "races-list-banner": {
    adSenseSlot: "",
    format: "auto",
    fullWidthResponsive: true,
  },
  "results-list-banner": {
    adSenseSlot: "",
    format: "auto",
    fullWidthResponsive: true,
  },
  "results-feed-mid": {
    adSenseSlot: "",
    format: "fluid",
    layoutKey: "",
  },
  "result-detail-rectangle": {
    adSenseSlot: "",
    format: "rectangle",
    fullWidthResponsive: true,
  },
  "mobile-sticky-bottom": {
    adSenseSlot: "",
    format: "auto",
    fullWidthResponsive: true,
  },
};

export function getAdConfig(slot: string): AdSenseConfig | null {
  const config = AD_SLOTS[slot];
  if (!config) return null;
  if (!ADSENSE_CLIENT) return null;
  if (!config.adSenseSlot) return null;
  return config;
}
