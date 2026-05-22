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
    adSenseSlot: "6656749168",
    format: "horizontal",
    fullWidthResponsive: true,
  },
  "home-bento-native": {
    adSenseSlot: "3895917514",
    format: "fluid",
    layoutKey: "-6t+ed+2i-1n-4w",
  },
  "races-list-banner": {
    adSenseSlot: "2188084172",
    format: "horizontal",
    fullWidthResponsive: true,
  },
  "results-list-banner": {
    adSenseSlot: "7248839167",
    format: "horizontal",
    fullWidthResponsive: true,
  },
  "results-feed-mid": {
    adSenseSlot: "7643590833",
    format: "fluid",
    layoutKey: "-ef+6k-30-ac+ty",
  },
  "history-list-banner": {
    adSenseSlot: "2188084172",
    format: "horizontal",
    fullWidthResponsive: true,
  },
  "history-feed-mid": {
    adSenseSlot: "7643590833",
    format: "fluid",
    layoutKey: "-ef+6k-30-ac+ty",
  },
  "result-detail-rectangle": {
    adSenseSlot: "1919427800",
    format: "rectangle",
    fullWidthResponsive: true,
  },
  "mobile-sticky-bottom": {
    adSenseSlot: "1718826251",
    format: "auto",
    fullWidthResponsive: true,
  },
  "side-rail-left": {
    adSenseSlot: "1718826251",
    format: "vertical",
  },
  "side-rail-right": {
    adSenseSlot: "1718826251",
    format: "vertical",
  },
};

export function getAdConfig(slot: string): AdSenseConfig | null {
  const config = AD_SLOTS[slot];
  if (!config) return null;
  if (!ADSENSE_CLIENT) return null;
  if (!config.adSenseSlot) return null;
  return config;
}
