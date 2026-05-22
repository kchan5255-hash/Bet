import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Noto_Sans_TC, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Footer } from "@/components/Footer";
import { AgeWarningBanner } from "@/components/AgeWarningBanner";
import { AdSlot } from "@/components/ads/AdSlot";
import { SideRailAds } from "@/components/ads/SideRailAds";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
const AT_SOCIAL_BAR  = process.env.NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR_SRC ?? "";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoTC = Noto_Sans_TC({
  variable: "--font-noto-tc",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Furlong — 香港賽馬量化分析平台",
    template: "%s — Furlong",
  },
  description:
    "Furlong 以量化模型分析香港賽馬，提供本期預測、歷史回測與賽果派彩資訊。內容僅供 18 歲以上人士參考，不構成投注建議。",
  keywords: [
    "香港賽馬",
    "賽馬數據",
    "賽馬分析",
    "賽馬預測",
    "量化模型",
    "Furlong",
  ],
  applicationName: "Furlong",
  authors: [{ name: "Furlong" }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
  openGraph: {
    type: "website",
    locale: "zh_HK",
    siteName: "Furlong",
    title: "Furlong — 香港賽馬量化分析平台",
    description:
      "以量化數據分析香港賽馬，提供本期預測、歷史回測與賽果派彩。本網站僅供 18 歲以上人士參考。",
  },
  ...(ADSENSE_CLIENT && {
    other: {
      "google-adsense-account": ADSENSE_CLIENT,
      robots: "noai, noimageai",
    },
  }),
  ...(!ADSENSE_CLIENT && {
    other: {
      robots: "noai, noimageai",
    },
  }),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-HK"
      className={`${inter.variable} ${notoTC.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {ADSENSE_CLIENT && (
          <Script
            id="adsense-script"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
        {AT_SOCIAL_BAR && (
          <Script
            id="adsterra-social-bar"
            strategy="afterInteractive"
            src={AT_SOCIAL_BAR}
          />
        )}
        <AgeWarningBanner />
        <NavBar />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <Footer />
        <SideRailAds />
        <AdSlot
          slot="mobile-sticky-bottom"
          layout="sticky-mobile"
          closable
          proHidden
        />
        <MobileTabBar />
      </body>
    </html>
  );
}
