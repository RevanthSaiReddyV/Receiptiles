export const metadata = {
  title: "Terms of Service — Receiptiles",
  description: "Terms and conditions for using Receiptiles.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1A]">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <a href="/" className="text-[#4A5D4E] text-sm font-medium hover:underline mb-8 inline-block">&larr; Back to Home</a>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-[#82907A] text-sm mb-12">Last updated: May 23, 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-[#3A3A38] text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Receiptiles (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. We may update these terms at any time; continued use constitutes acceptance of changes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">2. Description of Service</h2>
            <p>Receiptiles provides digital receipt capture, organization, and delivery through hardware adapters, NFC technology, email parsing, and mobile wallet integration. The Service includes web and mobile applications, API access, and hardware components.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">3. Eligibility</h2>
            <p>You must be at least 16 years old to use the Service. By creating an account, you represent that you meet this age requirement and have the legal capacity to enter into a binding agreement.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">4. Account Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>You must provide accurate and complete registration information.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Use the Service for any illegal purpose or in violation of any laws.</li>
              <li>Attempt to reverse-engineer, decompile, or hack the Service or hardware.</li>
              <li>Interfere with or disrupt the Service infrastructure.</li>
              <li>Upload malicious content or attempt to gain unauthorized access.</li>
              <li>Resell or redistribute the Service without written permission.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">6. Merchant Terms</h2>
            <p>Merchants using Receiptiles hardware and services additionally agree to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Use the hardware only at their authorized business locations.</li>
              <li>Not tamper with, modify, or reverse-engineer hardware adapters.</li>
              <li>Ensure appropriate signage notifying customers of digital receipt availability.</li>
              <li>Comply with all applicable PCI-DSS requirements for their payment systems.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">7. Intellectual Property</h2>
            <p>The Service, including all software, hardware designs, branding, and content, is owned by Receiptiles Inc. and protected by intellectual property laws. Your use of the Service does not grant you any ownership rights. You retain ownership of your receipt data.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">8. Data Usage & License</h2>
            <p>By using the Service, you grant Receiptiles a non-exclusive, worldwide license to process, store, and analyze your receipt data for the purposes described in our <a href="/privacy" className="text-[#4A5D4E] underline">Privacy Policy</a>, including generating aggregated insights and sharing de-identified data with third parties as described therein.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">9. Service Availability</h2>
            <p>We strive for high availability but do not guarantee uninterrupted service. We may perform maintenance, updates, or modifications that temporarily affect availability. We are not liable for any downtime or data delays.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Receiptiles shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of the Service.</p>
            <p className="mt-2">Our total liability for any claim shall not exceed the amount you paid us in the 12 months preceding the claim, or $100, whichever is greater.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">11. Termination</h2>
            <p>You may terminate your account at any time through account settings or by contacting support. We may suspend or terminate your account for violation of these terms. Upon termination, your data will be handled per our <a href="/privacy" className="text-[#4A5D4E] underline">Privacy Policy</a> retention schedule.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">12. Governing Law</h2>
            <p>These Terms shall be governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Delaware.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">13. Contact</h2>
            <p>For questions about these Terms, contact us at <strong>legal@receiptiles.com</strong>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
