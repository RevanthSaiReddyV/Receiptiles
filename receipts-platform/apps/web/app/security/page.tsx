export const metadata = {
  title: "Security — Receiptiles",
  description: "How Receiptiles keeps your data secure.",
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1A]">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <a href="/" className="text-[#4A5D4E] text-sm font-medium hover:underline mb-8 inline-block">&larr; Back to Home</a>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Security</h1>
        <p className="text-[#82907A] text-sm mb-12">Last updated: May 23, 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-[#3A3A38] text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">Infrastructure</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Hosted on SOC 2 Type II certified infrastructure (Vercel + Neon).</li>
              <li>All data encrypted at rest using AES-256.</li>
              <li>All connections secured with TLS 1.3 — no unencrypted traffic accepted.</li>
              <li>Database connections use connection pooling with SSL enforcement.</li>
              <li>Automated daily backups with geo-redundant storage.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">Application Security</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Authentication via NextAuth with bcrypt password hashing (12 rounds).</li>
              <li>CSRF protection on all state-changing operations.</li>
              <li>Rate limiting via Upstash Redis on sensitive endpoints.</li>
              <li>Input validation with Zod schemas on all API boundaries.</li>
              <li>Webhook signature verification (HMAC-SHA256) for all inbound integrations.</li>
              <li>Device authentication using cryptographically random provisioning keys.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">Hardware Security</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>On-device receipt parsing — raw data never leaves the adapter unnecessarily.</li>
              <li>NFC handover uses unique, time-limited claim tokens.</li>
              <li>Hardware devices authenticate with per-device API keys.</li>
              <li>Firmware updates are signed and verified before installation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">Access Control</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Principle of least privilege for all internal systems.</li>
              <li>Multi-factor authentication required for infrastructure access.</li>
              <li>Audit logging on all administrative actions.</li>
              <li>Regular access reviews and credential rotation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">Monitoring & Response</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Real-time error monitoring via Sentry.</li>
              <li>Automated alerting on anomalous traffic patterns.</li>
              <li>Documented incident response plan with defined roles.</li>
              <li>72-hour breach notification commitment.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">Responsible Disclosure</h2>
            <p>If you discover a security vulnerability, please report it responsibly to <strong>security@receiptiles.com</strong>. We ask that you:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Do not publicly disclose the vulnerability before we have addressed it.</li>
              <li>Provide sufficient detail for us to reproduce the issue.</li>
              <li>Allow reasonable time for us to remediate (typically 90 days).</li>
            </ul>
            <p className="mt-2">We do not pursue legal action against good-faith security researchers.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
