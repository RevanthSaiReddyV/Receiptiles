export const metadata = {
  title: "Data Processing Agreement — Receiptiles",
  description: "Data Processing Agreement for Receiptiles merchants and enterprise customers.",
};

export default function DPAPage() {
  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1A]">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <a href="/" className="text-[#4A5D4E] text-sm font-medium hover:underline mb-8 inline-block">&larr; Back to Home</a>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Data Processing Agreement</h1>
        <p className="text-[#82907A] text-sm mb-12">Last updated: May 23, 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-[#3A3A38] text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">1. Scope</h2>
            <p>This Data Processing Agreement (&quot;DPA&quot;) applies to the processing of personal data by Receiptiles Inc. (&quot;Processor&quot;) on behalf of the merchant or enterprise customer (&quot;Controller&quot;) who has entered into a service agreement for the use of Receiptiles.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">2. Definitions</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Personal Data:</strong> Any information relating to an identified or identifiable natural person.</li>
              <li><strong>Processing:</strong> Any operation performed on personal data (collection, storage, use, disclosure, erasure).</li>
              <li><strong>Data Subject:</strong> The individual whose personal data is being processed (e.g., the merchant&apos;s customer).</li>
              <li><strong>Sub-processor:</strong> A third party engaged by the Processor to assist in processing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">3. Processing Details</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Subject matter:</strong> Digital receipt generation, storage, and delivery.</li>
              <li><strong>Duration:</strong> For the term of the service agreement plus retention period.</li>
              <li><strong>Nature & purpose:</strong> Processing transaction data to deliver digital receipts to customers.</li>
              <li><strong>Categories of data:</strong> Transaction amounts, item descriptions, dates, last-4 card digits, customer device identifiers.</li>
              <li><strong>Categories of data subjects:</strong> Customers of the Controller (merchant).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">4. Processor Obligations</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Process personal data only on documented instructions from the Controller.</li>
              <li>Ensure persons authorized to process data are bound by confidentiality.</li>
              <li>Implement appropriate technical and organizational security measures.</li>
              <li>Engage sub-processors only with prior written consent of the Controller.</li>
              <li>Assist the Controller in responding to data subject requests.</li>
              <li>Delete or return all personal data upon termination of the agreement.</li>
              <li>Make available all information necessary to demonstrate compliance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">5. Controller Obligations</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Ensure there is a lawful basis for providing personal data to the Processor.</li>
              <li>Inform the Processor of any specific data protection requirements.</li>
              <li>Notify customers that digital receipts are processed by Receiptiles.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">6. Sub-processors</h2>
            <p>Current sub-processors:</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border border-[#EBEAE4] rounded-lg overflow-hidden">
                <thead className="bg-[#EBEAE4]">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Provider</th>
                    <th className="text-left px-4 py-2 font-semibold">Purpose</th>
                    <th className="text-left px-4 py-2 font-semibold">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEAE4]">
                  <tr><td className="px-4 py-2">Vercel Inc.</td><td className="px-4 py-2">Application hosting</td><td className="px-4 py-2">USA</td></tr>
                  <tr><td className="px-4 py-2">Neon Inc.</td><td className="px-4 py-2">Database hosting</td><td className="px-4 py-2">USA</td></tr>
                  <tr><td className="px-4 py-2">Cloudflare Inc.</td><td className="px-4 py-2">File storage (R2)</td><td className="px-4 py-2">Global</td></tr>
                  <tr><td className="px-4 py-2">Upstash Inc.</td><td className="px-4 py-2">Redis caching</td><td className="px-4 py-2">USA</td></tr>
                  <tr><td className="px-4 py-2">Resend Inc.</td><td className="px-4 py-2">Email delivery</td><td className="px-4 py-2">USA</td></tr>
                  <tr><td className="px-4 py-2">Google LLC</td><td className="px-4 py-2">AI parsing (Gemini)</td><td className="px-4 py-2">USA</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-[#6B6A65]">The Controller will be notified at least 14 days before any new sub-processor is engaged.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">7. Security Measures</h2>
            <p>The Processor implements the measures described in our <a href="/security" className="text-[#4A5D4E] underline">Security page</a>, including encryption at rest (AES-256), encryption in transit (TLS 1.3), access controls, monitoring, and incident response procedures.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">8. International Transfers</h2>
            <p>Where personal data is transferred outside the EEA, the transfer is covered by Standard Contractual Clauses (Module 2: Controller to Processor) as adopted by the European Commission.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">9. Audits</h2>
            <p>The Controller may audit the Processor&apos;s compliance with this DPA upon 30 days written notice, no more than once per year. The Processor will make available SOC 2 reports and relevant documentation. On-site audits are available for enterprise customers.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">10. Contact</h2>
            <p>To execute this DPA or request a signed copy, contact <strong>legal@receiptiles.com</strong>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
