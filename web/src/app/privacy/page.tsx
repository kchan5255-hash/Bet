import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "私隱政策 — Furlong",
  description: "Furlong 賽馬數據分析平台的個人資料收集、使用、披露及保護政策。",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "2026-05-22";

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="私隱政策"
      subtitle="本政策說明 Furlong 如何收集、使用、披露及保護你的個人資料。"
      lastUpdated={LAST_UPDATED}
    >
      <LegalSection id="intro" title="1. 概覽">
        <p>
          Furlong（下稱「本網站」、「我們」）是一個提供香港賽馬量化分析資訊的平台。
          我們重視你的私隱，並按照香港《個人資料（私隱）條例》及一般國際標準處理個人資料。
        </p>
        <p>
          本政策適用於 Furlong 全部頁面與功能，包括但不限於本期預測、賽果派彩、歷史記錄與帳戶服務。
          使用本網站即表示你已閱讀並同意本政策。
        </p>
      </LegalSection>

      <LegalSection id="collect" title="2. 我們收集的資料">
        <p>本網站可能收集以下資料：</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-text">帳戶資料</strong>：登記時提供的電郵地址、密碼（經單向雜湊處理）。
          </li>
          <li>
            <strong className="text-text">訂閱與付款狀態</strong>：訂閱計劃、有效期，付款流程由第三方處理者完成，本網站不會儲存信用卡號碼。
          </li>
          <li>
            <strong className="text-text">使用紀錄</strong>：頁面瀏覽、互動事件、瀏覽器類型、裝置資訊、IP 位址、來源頁面。
          </li>
          <li>
            <strong className="text-text">Cookie 與本地儲存</strong>：用於維持登入狀態、記錄使用偏好（例如關閉廣告提示）、廣告投放及成效衡量。
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="use" title="3. 資料用途">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>提供、維護並改善本網站功能與內容。</li>
          <li>驗證身分、保護帳戶安全、防止濫用與欺詐。</li>
          <li>處理訂閱、付款與客戶查詢。</li>
          <li>分析使用情況以優化用戶體驗。</li>
          <li>透過 Google AdSense 等廣告網絡顯示與你相關的廣告。</li>
          <li>應法律要求或行政機關合法請求作出披露。</li>
        </ul>
      </LegalSection>

      <LegalSection id="cookies" title="4. Cookie 與類似技術">
        <p>
          本網站使用 Cookie、本地儲存（localStorage / sessionStorage）及類似技術以提供登入、偏好設定及廣告功能。
          你可以隨時透過瀏覽器設定清除或拒絕 Cookie，但部分功能可能無法正常運作。
        </p>
      </LegalSection>

      <LegalSection id="ads" title="5. 第三方廣告（Google AdSense）">
        <p>
          本網站使用 Google AdSense 顯示廣告。Google 與其合作夥伴可能基於你瀏覽本網站及其他網站的紀錄，
          使用 Cookie 投放更切合你興趣的廣告。
        </p>
        <p>你可以透過下列方式管理個人化廣告：</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            前往{" "}
            <a
              className="text-precision-glow underline underline-offset-2 hover:opacity-80"
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google 廣告設定
            </a>{" "}
            停用個人化廣告。
          </li>
          <li>
            前往{" "}
            <a
              className="text-precision-glow underline underline-offset-2 hover:opacity-80"
              href="https://www.aboutads.info/choices/"
              target="_blank"
              rel="noopener noreferrer"
            >
              aboutads.info
            </a>{" "}
            或{" "}
            <a
              className="text-precision-glow underline underline-offset-2 hover:opacity-80"
              href="https://www.youronlinechoices.eu/"
              target="_blank"
              rel="noopener noreferrer"
            >
              youronlinechoices.eu
            </a>{" "}
            退出第三方供應商個人化廣告。
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="thirdparty" title="6. 第三方服務提供者">
        <p>本網站依靠以下第三方服務以正常運作，相關服務各自有其私隱政策：</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-text">Vercel</strong>：託管與部署。
          </li>
          <li>
            <strong className="text-text">Supabase</strong>：資料庫與身分驗證。
          </li>
          <li>
            <strong className="text-text">Google AdSense</strong>：廣告投放。
          </li>
        </ul>
        <p>本網站不會將個人資料出售予任何第三方。</p>
      </LegalSection>

      <LegalSection id="retention" title="7. 資料保留">
        <p>
          帳戶資料於帳戶有效期間保留。帳戶刪除後，我們會於合理期間內移除可識別個人之資料，
          但匯總、不可識別個人之統計資料可能會繼續保留作分析用途。
        </p>
      </LegalSection>

      <LegalSection id="rights" title="8. 你的權利">
        <p>根據香港《個人資料（私隱）條例》，你有權：</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>查閱我們持有關於你的個人資料。</li>
          <li>要求更正不準確的資料。</li>
          <li>要求刪除帳戶與相關資料。</li>
          <li>撤回先前同意（撤回不影響撤回前的處理）。</li>
        </ul>
        <p>
          如需行使上述權利，請透過{" "}
          <a
            className="text-precision-glow underline underline-offset-2 hover:opacity-80"
            href="/contact"
          >
            聯絡頁
          </a>{" "}
          與我們聯絡。
        </p>
      </LegalSection>

      <LegalSection id="children" title="9. 未成年人士">
        <p>
          本網站僅面向 18 歲或以上的香港居民。我們不會故意收集 18 歲以下人士的個人資料。
          如發現相關資料已被收集，將立即刪除。
        </p>
      </LegalSection>

      <LegalSection id="changes" title="10. 政策修訂">
        <p>
          我們可能不時修訂本政策。如有重大變更，將在本頁面顯示更新日期，並於必要時透過電郵或網站公告通知。
        </p>
      </LegalSection>

      <LegalSection id="contact" title="11. 聯絡我們">
        <p>
          如對本政策有任何疑問，請前往{" "}
          <a
            className="text-precision-glow underline underline-offset-2 hover:opacity-80"
            href="/contact"
          >
            聯絡頁
          </a>
          。
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
