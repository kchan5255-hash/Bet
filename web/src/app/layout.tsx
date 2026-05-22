import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Noto_Sans_TC, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { MobileTabBar } from "@/components/MobileTabBar";
import { AdSlot } from "@/components/ads/AdSlot";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

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
  title: "Furlong — 賽馬數據智能",
  description: "量化分析香港賽馬，以數據洞察每一場賽事",
  ...(ADSENSE_CLIENT && {
    other: {
      "google-adsense-account": ADSENSE_CLIENT,
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
        <NavBar />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <AdSlot
          slot="mobile-sticky-bottom"
          layout="sticky-mobile"
          closable
          proHidden
        />
        <MobileTabBar />
        <a
          href="/api/trap?__trap=1&source=layout"
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        >
          Hidden crawl trap
        </a>
      </body>
    </html>
  );
}
