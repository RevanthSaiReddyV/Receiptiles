export const metadata = {
  title: "Privacy Policy — Receiptiles",
  description: "How Receiptiles collects, uses, and shares your data.",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1A]">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <a href="/" className="text-[#4A5D4E] text-sm font-medium hover:underline mb-8 inline-block">&larr; Back to Home</a>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-[#82907A] text-sm mb-12">Last updated: May 23, 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-[#3A3A38] text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">1. Information We Collect</h2>
            <p>When you use Receiptiles, we collect:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Account information:</strong> Email address, name, and authentication credentials.</li>
              <li><strong>Receipt data:</strong> Merchant name, items purchased, prices, dates, payment method (last 4 digits only), and transaction totals.</li>
              <li><strong>Device information:</strong> Browser type, operating system, and device identifiers for wallet pass delivery.</li>
              <li><strong>Usage data:</strong> Pages visited, features used, and interaction patterns — collected via cookieless analytics (Umami). No personal identifiers are stored.</li>
              <li><strong>Email connection data:</strong> When you connect Gmail or Outlook, we access receipt-related emails only. We do not read personal correspondence.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide, maintain, and improve the Receiptiles service.</li>
              <li>Parse and organize your receipts into structured digital records.</li>
              <li>Deliver digital receipts to your Apple Wallet or Google Wallet.</li>
              <li>Generate spending insights, budget tracking, and warranty alerts.</li>
              <li>Communicate service updates, security alerts, and support responses.</li>
              <li>Develop aggregate analytics for merchants (see Section 4).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">3. Data Storage & Security</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>All data is encrypted at rest (AES-256) and in transit (TLS 1.3).</li>
              <li>Receipt data is processed on-device where possible before transmission.</li>
              <li>Infrastructure is hosted on SOC 2 Type II certified providers.</li>
              <li>Database backups are encrypted and stored in geographically redundant locations.</li>
              <li>We conduct regular security audits and penetration testing.</li>
            </ul>
          </section>

          <section className="bg-[#FEF9E7] border border-[#F5E6A3] rounded-xl p-6">
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">4. Data Sharing & Third Parties</h2>
            <p className="mb-3">We share certain data with third parties in the following ways:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Aggregated merchant analytics:</strong> We provide merchants with anonymized, aggregated purchasing trend data derived from receipt information. This data cannot identify individual consumers.</li>
              <li><strong>Data partnerships:</strong> We may share de-identified and aggregated consumer spending patterns with select commercial partners for market research, advertising, and analytics purposes.</li>
              <li><strong>Service providers:</strong> We share data with infrastructure providers (hosting, email delivery, payment processing) strictly to operate the service, under contractual data protection obligations.</li>
              <li><strong>Legal compliance:</strong> We may disclose data when required by law, subpoena, or to protect our rights and safety.</li>
            </ul>
            <p className="mt-4 text-sm text-[#6B6A65]">
              <strong>Your control:</strong> You may opt out of data partnerships at any time via your account settings. Opting out does not affect your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">5. Cookies & Tracking</h2>
            <p>Our public website uses <strong>Umami</strong>, a cookieless, privacy-focused analytics tool. It does not use cookies, does not track individuals across sites, and does not collect personal data. No cookie consent banner is required.</p>
            <p className="mt-2">Within the authenticated app, we use PostHog for product analytics to improve the user experience. PostHog is self-hosted on our infrastructure.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">6. Your Rights</h2>
            <p>Depending on your jurisdiction (GDPR, CCPA, etc.), you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Access:</strong> Request a copy of all data we hold about you.</li>
              <li><strong>Deletion:</strong> Request complete deletion of your account and all associated data.</li>
              <li><strong>Export:</strong> Download all your receipt data in a machine-readable format (JSON/CSV).</li>
              <li><strong>Opt out of data sales:</strong> Under CCPA, you can opt out of the sale of personal information.</li>
              <li><strong>Rectification:</strong> Correct inaccurate personal data.</li>
              <li><strong>Restriction:</strong> Limit how we process your data.</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, email <strong>privacy@receiptiles.com</strong> or use the controls in your account settings. We respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">7. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Active accounts: Data retained for the lifetime of the account.</li>
              <li>Deleted accounts: All personal data purged within 30 days. Aggregated, de-identified data may be retained.</li>
              <li>Inactive accounts: Accounts inactive for 24+ months may be subject to deletion after notification.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">8. Children&apos;s Privacy</h2>
            <p>Receiptiles is not directed at children under 16. We do not knowingly collect personal information from children. If we learn we have collected data from a child, we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">9. International Transfers</h2>
            <p>Your data may be processed in the United States or other countries where our service providers operate. We ensure appropriate safeguards (Standard Contractual Clauses or equivalent) are in place for international transfers.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">10. Changes to This Policy</h2>
            <p>We may update this policy from time to time. Material changes will be communicated via email or in-app notification at least 14 days before taking effect.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">11. Contact</h2>
            <p>For privacy-related questions or data requests:</p>
            <ul className="list-none pl-0 space-y-1 mt-2">
              <li><strong>Email:</strong> privacy@receiptiles.com</li>
              <li><strong>Data Protection Officer:</strong> dpo@receiptiles.com</li>
              <li><strong>Address:</strong> Receiptiles Inc., [Address to be added]</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
