export const metadata = {
  title: "Data Protection Policy — Receiptiles",
  description: "How Receiptiles protects your data.",
};

export default function DataPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1A]">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <a href="/" className="text-[#4A5D4E] text-sm font-medium hover:underline mb-8 inline-block">&larr; Back to Home</a>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Data Protection Policy</h1>
        <p className="text-[#82907A] text-sm mb-12">Last updated: May 23, 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-[#3A3A38] text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">1. Our Commitment</h2>
            <p>Receiptiles is committed to protecting the personal data of all users. This policy outlines the technical and organizational measures we implement to safeguard your information in compliance with GDPR, CCPA, and other applicable data protection regulations.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">2. Data Protection Principles</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Lawfulness:</strong> We process data only with a valid legal basis.</li>
              <li><strong>Purpose limitation:</strong> Data is collected for specified, explicit purposes.</li>
              <li><strong>Data minimization:</strong> We collect only what is necessary for the stated purpose.</li>
              <li><strong>Accuracy:</strong> We take reasonable steps to keep data accurate and up to date.</li>
              <li><strong>Storage limitation:</strong> Data is retained only as long as necessary.</li>
              <li><strong>Integrity & confidentiality:</strong> Appropriate security measures protect all data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">3. Legal Basis for Processing</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Contract performance:</strong> Processing receipt data to deliver the service you signed up for.</li>
              <li><strong>Legitimate interest:</strong> Analytics, fraud prevention, and service improvement.</li>
              <li><strong>Consent:</strong> Marketing communications and optional data partnerships (with opt-out).</li>
              <li><strong>Legal obligation:</strong> Tax record retention, law enforcement requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">4. Technical Safeguards</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>AES-256 encryption at rest for all stored data.</li>
              <li>TLS 1.3 encryption for all data in transit.</li>
              <li>On-device processing where feasible (edge parsing on hardware adapter).</li>
              <li>Database-level row security and access controls.</li>
              <li>Automated vulnerability scanning and dependency auditing.</li>
              <li>Regular penetration testing by independent third parties.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">5. Organizational Safeguards</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Principle of least privilege for all internal access.</li>
              <li>Mandatory security training for all team members.</li>
              <li>Background checks for personnel with data access.</li>
              <li>Documented incident response procedures.</li>
              <li>Annual SOC 2 Type II audits.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">6. Data Breach Response</h2>
            <p>In the event of a data breach:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>We will notify affected users within 72 hours of discovery.</li>
              <li>We will notify relevant supervisory authorities as required by law.</li>
              <li>We will provide clear information about what data was affected and remediation steps.</li>
              <li>We will conduct a root cause analysis and implement preventive measures.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">7. International Data Transfers</h2>
            <p>When data is transferred outside of the EEA, we rely on Standard Contractual Clauses (SCCs) approved by the European Commission, or transfers to countries with an adequacy decision. All sub-processors are contractually bound to equivalent data protection standards.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">8. Data Protection Officer</h2>
            <p>Our Data Protection Officer can be reached at <strong>dpo@receiptiles.com</strong> for any data protection queries, subject access requests, or complaints.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
