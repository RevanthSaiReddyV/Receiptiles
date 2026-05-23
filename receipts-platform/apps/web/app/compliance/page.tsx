export const metadata = {
  title: "Compliance — Receiptiles",
  description: "Regulatory compliance overview for Receiptiles.",
};

export default function CompliancePage() {
  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1A]">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <a href="/" className="text-[#4A5D4E] text-sm font-medium hover:underline mb-8 inline-block">&larr; Back to Home</a>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Compliance</h1>
        <p className="text-[#82907A] text-sm mb-12">Last updated: May 23, 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-[#3A3A38] text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">SOC 2 Type II</h2>
            <p>Receiptiles infrastructure is hosted on SOC 2 Type II certified providers. Our application and operational controls are designed to meet the Trust Services Criteria for Security, Availability, and Confidentiality.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">GDPR (EU/EEA)</h2>
            <p>We comply with the General Data Protection Regulation:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Lawful basis documented for all processing activities.</li>
              <li>Data subject rights fulfilled within 30 days (access, erasure, portability, rectification).</li>
              <li>Data Protection Impact Assessments conducted for high-risk processing.</li>
              <li>Standard Contractual Clauses in place for international transfers.</li>
              <li>Appointed Data Protection Officer reachable at dpo@receiptiles.com.</li>
              <li>Breach notification within 72 hours to supervisory authorities.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">CCPA (California)</h2>
            <p>We comply with the California Consumer Privacy Act:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Right to know what personal information is collected and how it is used.</li>
              <li>Right to delete personal information upon request.</li>
              <li>Right to opt out of the sale or sharing of personal information.</li>
              <li>No discrimination for exercising privacy rights.</li>
              <li>Annual disclosure of data categories collected, sold, and shared.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">PCI-DSS Considerations</h2>
            <p>Receiptiles does not store full payment card numbers. We only process the last 4 digits of card numbers as printed on receipts. Payment processing is handled entirely by the merchant&apos;s existing POS system. Our service does not interact with cardholder data environments.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">Email Compliance (CAN-SPAM / GDPR)</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>All marketing emails include an unsubscribe link.</li>
              <li>Unsubscribe requests honored within 24 hours.</li>
              <li>Transactional emails (receipts, security alerts) sent only when relevant.</li>
              <li>No purchased email lists — all contacts are self-opted.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">Accessibility (WCAG)</h2>
            <p>We are committed to making our service accessible to all users. Our web application targets WCAG 2.1 Level AA compliance, including keyboard navigation, screen reader compatibility, and sufficient color contrast.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">Environmental Compliance</h2>
            <p>Our hardware adapters comply with RoHS (Restriction of Hazardous Substances) and WEEE (Waste Electrical and Electronic Equipment) directives. We provide recycling instructions and accept returns of hardware for responsible disposal.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">Questions</h2>
            <p>For compliance inquiries, audit requests, or certification documentation, contact <strong>compliance@receiptiles.com</strong>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
