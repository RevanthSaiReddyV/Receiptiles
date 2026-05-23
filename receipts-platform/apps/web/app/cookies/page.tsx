export const metadata = {
  title: "Cookie Policy — Receiptiles",
  description: "How Receiptiles uses cookies and tracking technologies.",
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1A]">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <a href="/" className="text-[#4A5D4E] text-sm font-medium hover:underline mb-8 inline-block">&larr; Back to Home</a>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Cookie Policy</h1>
        <p className="text-[#82907A] text-sm mb-12">Last updated: May 23, 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-[#3A3A38] text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">1. Our Approach</h2>
            <p>Receiptiles is designed with privacy in mind. Our public-facing website uses <strong>Umami</strong>, a cookieless analytics solution that does not store any cookies on your device and does not track you across websites. No cookie consent banner is required for our landing pages.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">2. Cookies We Use</h2>
            <p>Within the authenticated application (after you log in), we use the following:</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border border-[#EBEAE4] rounded-lg overflow-hidden">
                <thead className="bg-[#EBEAE4]">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Cookie</th>
                    <th className="text-left px-4 py-2 font-semibold">Purpose</th>
                    <th className="text-left px-4 py-2 font-semibold">Duration</th>
                    <th className="text-left px-4 py-2 font-semibold">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEAE4]">
                  <tr>
                    <td className="px-4 py-2 font-mono text-xs">authjs.session-token</td>
                    <td className="px-4 py-2">Keeps you logged in</td>
                    <td className="px-4 py-2">30 days</td>
                    <td className="px-4 py-2">Essential</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-xs">authjs.csrf-token</td>
                    <td className="px-4 py-2">Prevents cross-site request forgery</td>
                    <td className="px-4 py-2">Session</td>
                    <td className="px-4 py-2">Essential</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-xs">authjs.callback-url</td>
                    <td className="px-4 py-2">Redirects after authentication</td>
                    <td className="px-4 py-2">Session</td>
                    <td className="px-4 py-2">Essential</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">3. Analytics (No Cookies)</h2>
            <p>Our public website analytics are powered by Umami, which is entirely cookieless. It collects:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Page URL visited</li>
              <li>Referrer URL</li>
              <li>Browser and OS type</li>
              <li>Country (from IP, which is not stored)</li>
            </ul>
            <p className="mt-2">No personal data is collected, no cookies are set, and no cross-site tracking occurs.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">4. Product Analytics (Authenticated Users)</h2>
            <p>For logged-in users, we use PostHog to understand how features are used and to improve the product. PostHog may set a cookie to distinguish unique sessions. This data is used solely for product improvement and is not shared with third-party advertisers.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">5. Managing Cookies</h2>
            <p>Since we only use essential cookies (required for authentication), disabling them will prevent you from logging into your account. You can clear cookies at any time through your browser settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1C1A] mb-3">6. Contact</h2>
            <p>Questions about our cookie practices? Contact <strong>privacy@receiptiles.com</strong>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
