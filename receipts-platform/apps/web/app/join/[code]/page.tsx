import { db } from "@receipts/db";
import { redirect } from "next/navigation";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // Look up the referral
  const referral = await db.referral.findFirst({
    where: { code: { startsWith: code.split("_")[0] }, channel: "primary" },
    include: { referrer: { select: { name: true, image: true } } },
  });

  if (!referral) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-extrabold text-neutral-900 mb-2">Invalid Referral Link</h1>
          <p className="text-sm text-neutral-500 mb-6">This referral code is no longer valid or has expired.</p>
          <a
            href="https://receipts.app"
            className="inline-block px-6 py-3 rounded-xl bg-neutral-900 text-white font-semibold text-sm"
          >
            Visit Receipts
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-4">🧾</div>
        <h1 className="text-2xl font-extrabold text-neutral-900 mb-2">
          {referral.referrer.name ?? "Someone"} invited you to Receipts
        </h1>
        <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
          The universal receipt wallet. All your purchases from every store, automatically organized in one place.
        </p>

        {/* Benefits */}
        <div className="bg-neutral-50 rounded-xl p-4 mb-6 text-left">
          <ul className="space-y-3">
            {[
              "Auto-import receipts from 200+ retailers",
              "Track spending across all your cards",
              "Never lose a receipt again",
              "250 bonus points for joining",
            ].map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm text-neutral-700">
                <span className="text-emerald-500 font-bold">✓</span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* Referral Code Display */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-6">
          <p className="text-xs text-emerald-600 font-medium">Referral Code Applied</p>
          <p className="text-lg font-bold text-emerald-700">{code}</p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <a
            href={`receipts://join?code=${code}`}
            className="block w-full px-6 py-4 rounded-xl bg-neutral-900 text-white font-bold text-sm hover:bg-neutral-800"
          >
            Open in App
          </a>
          <a
            href={`/signup?ref=${code}`}
            className="block w-full px-6 py-4 rounded-xl border border-neutral-200 text-neutral-700 font-semibold text-sm hover:bg-neutral-50"
          >
            Sign Up on Web
          </a>
        </div>

        <p className="text-xs text-neutral-400 mt-4">
          Free forever. No credit card required.
        </p>
      </div>
    </div>
  );
}
