import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service — Furlong",
  description:
    "Furlong terms of service, user obligations, anti-scraping clause, and legal notices.",
  alternates: { canonical: "/terms/en", languages: { "zh-HK": "/terms" } },
};

const LAST_UPDATED = "2026-05-23";

export default function TermsEnPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="By using Furlong you agree to the following terms. Please read them carefully."
      lastUpdated={LAST_UPDATED}
      locale="en"
      altLocaleHref="/terms"
      altLocaleLabel="繁體中文"
    >
      <LegalSection id="nature" title="1. Nature of the Service">
        <p>
          Furlong is a quantitative analytics platform for Hong Kong horse
          racing. Content includes race-day predictions, historical data, model
          scores, and profit-and-loss back-tests.
        </p>
        <p>
          <strong className="text-text">
            This site is not a betting platform.
          </strong>{" "}
          We do not accept, process, or relay any wagers. Actual betting must
          be placed through the Hong Kong Jockey Club or another lawfully
          licensed operator at the user&rsquo;s sole risk.
        </p>
      </LegalSection>

      <LegalSection id="eligibility" title="2. Eligibility">
        <p>To use this site you must:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Be at least 18 years old.</li>
          <li>
            Be located in a jurisdiction where viewing horse-racing information
            and placing wagers is lawful.
          </li>
          <li>
            Provide registration information that is true, accurate, and current.
          </li>
        </ul>
        <p>
          If you do not meet any of the above, please stop using this site
          immediately.
        </p>
      </LegalSection>

      <LegalSection id="account" title="3. Account &amp; Security">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            You are responsible for safeguarding your password; activity from
            your account is deemed your own.
          </li>
          <li>Notify us immediately of any unauthorised access.</li>
          <li>
            Account sharing, reselling subscription rights, and automated
            access to this site are prohibited.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="subscription" title="4. Subscription &amp; Payment">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Subscription details, prices, and contents are listed on the subscription page.</li>
          <li>
            All payments are non-refundable unless otherwise required by law or
            promised by us.
          </li>
          <li>
            We reserve the right to adjust subscription contents, prices, and
            availability; material changes will be notified in advance.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="conduct" title="5. User Conduct">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Violate any applicable law, regulation, or third-party right.</li>
          <li>
            Attempt to break into, damage, or interfere with our systems or
            other users.
          </li>
          <li>Bulk-scrape, reproduce, or redistribute our content commercially.</li>
          <li>Impersonate any person or provide false information.</li>
          <li>Use our content for any unlawful, unethical, or misleading purpose.</li>
        </ul>
      </LegalSection>

      <LegalSection id="ai-tdm" title="6. No Scraping &amp; No AI Training">
        <p>
          Except with our express written permission, the following are{" "}
          <strong className="text-text">strictly prohibited</strong> against
          any page, dataset, API endpoint, or internal JSON of this site:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Bulk extraction by means of crawlers, robots, headless browsers,
            automated scripts, or comparable tools.
          </li>
          <li>
            Bypassing, disabling, or interfering with our access controls,
            rate limits, challenges, or anti-scraping mechanisms.
          </li>
          <li>
            Using our content to train, fine-tune, evaluate, perform
            retrieval-augmented generation (RAG) on, or otherwise feed any
            artificial-intelligence, machine-learning, neural-network, or
            large-language-model system, whether commercial or non-commercial.
          </li>
          <li>
            Mirroring, redistributing, reselling, embedding into third-party
            platforms, or incorporating our content into any derivative dataset.
          </li>
        </ul>
        <p>
          Pursuant to Article 4 of EU Directive 2019/790 (the DSM Directive),
          the operator of this site expressly{" "}
          <strong className="text-text">
            reserves all text and data mining rights
          </strong>{" "}
          (TDM rights reservation). The reservation is made in both
          human-readable form (these Terms) and machine-readable form
          (<code>robots.txt</code>, <code>ai.txt</code>,{" "}
          <code>X-Robots-Tag</code>, and the <code>noai</code> meta tag).
        </p>
        <p>
          Violations may constitute any or all of the following:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-text">
              Section 161, Crimes Ordinance (Cap. 200), Hong Kong
            </strong>{" "}
            — access to computer with criminal or dishonest intent.
          </li>
          <li>
            <strong className="text-text">
              Personal Data (Privacy) Ordinance (Cap. 486), Hong Kong
            </strong>{" "}
            — unauthorised collection, processing, or transfer of personal data.
          </li>
          <li>
            <strong className="text-text">
              U.S. Computer Fraud and Abuse Act (CFAA, 18 U.S.C. § 1030)
            </strong>{" "}
            — unauthorised access to a protected computer.
          </li>
          <li>
            Copyright infringement under the Copyright Ordinance (Cap. 528),
            Hong Kong.
          </li>
          <li>Liability in damages for breach of contract (these Terms).</li>
        </ul>
        <p>
          Licensing inquiries, DMCA notices, and commercial-use requests should
          be submitted via the{" "}
          <a
            className="text-precision-glow underline underline-offset-2 hover:opacity-80"
            href="/contact"
          >
            contact page
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="ip" title="7. Intellectual Property">
        <p>
          All content on this site — including text, models, scores, charts,
          interface design, marks, and source code — is owned by us or our
          licensors and is protected by Hong Kong and international copyright
          law.
        </p>
        <p>
          Reproduction, modification, distribution, public display, or
          commercial use without prior written consent is prohibited.
          Statistical citations must credit the source.
        </p>
      </LegalSection>

      <LegalSection id="thirdparty" title="8. Third-Party Data">
        <p>
          Race data is sourced from publicly available Hong Kong Jockey Club
          information and other public sources. This site is not affiliated
          with, endorsed by, or sponsored by the Hong Kong Jockey Club. All
          marks belong to their respective owners.
        </p>
      </LegalSection>

      <LegalSection id="disclaimer" title="9. Disclaimer">
        <p>
          Predictions, scores, and analysis on this site are{" "}
          <strong className="text-text">for reference only</strong> and do not
          constitute betting, financial, or investment advice. Past back-test
          results do not represent future performance; horse-race wagering
          carries significant uncertainty and may result in total loss.
        </p>
        <p>
          The service is provided on an &ldquo;as-is&rdquo; basis with no
          express or implied warranty of accuracy, completeness, timeliness, or
          availability. See the full{" "}
          <a
            className="text-precision-glow underline underline-offset-2 hover:opacity-80"
            href="/disclaimer"
          >
            disclaimer
          </a>{" "}
          for risk details.
        </p>
      </LegalSection>

      <LegalSection id="limitation" title="10. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, neither this site, its
          operator, nor any affiliate is liable for:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Any wagering decisions made by users based on our content.</li>
          <li>
            Any direct, indirect, incidental, or consequential loss arising
            from the use of or inability to use this site.
          </li>
          <li>
            Outages or errors of third-party services including, without
            limitation, Google AdSense, Supabase, and Vercel.
          </li>
          <li>
            Data loss or damage caused by cyber-attacks, system failures, or
            force majeure.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="termination" title="11. Termination">
        <p>
          We may suspend or terminate your account without notice if you breach
          these Terms. Surviving clauses (including intellectual property,
          disclaimer, and limitation of liability) remain in force after
          termination.
        </p>
      </LegalSection>

      <LegalSection id="modifications" title="12. Changes to These Terms">
        <p>
          We may revise these Terms from time to time. Material changes will be
          reflected in the &ldquo;Last updated&rdquo; date and, where
          appropriate, by email or on-site notice. Your continued use of the
          site after changes constitutes acceptance of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection id="law" title="13. Governing Law &amp; Jurisdiction">
        <p>
          These Terms are governed by and construed in accordance with the laws
          of the Hong Kong Special Administrative Region. Disputes arising out
          of or relating to these Terms shall be submitted to the
          non-exclusive jurisdiction of the courts of Hong Kong.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="14. Contact">
        <p>
          For questions about these Terms, please use the{" "}
          <a
            className="text-precision-glow underline underline-offset-2 hover:opacity-80"
            href="/contact"
          >
            contact page
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
