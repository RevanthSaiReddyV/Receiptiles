import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { WalletCard } from "./wallet-card";

export const dynamic = 'force-dynamic';

// Points system: 10 points per receipt, bonuses for milestones
function calculatePoints(receiptCount: number): number {
  let points = receiptCount * 10;
  if (receiptCount >= 10) points += 50;
  if (receiptCount >= 25) points += 100;
  if (receiptCount >= 50) points += 250;
  if (receiptCount >= 100) points += 500;
  if (receiptCount >= 250) points += 1000;
  if (receiptCount >= 500) points += 2500;
  if (receiptCount >= 1000) points += 5000;
  return points;
}

function getLevel(points: number): { name: string; min: number; max: number; color: string } {
  if (points >= 10000) return { name: "Planet Protector", min: 10000, max: 25000, color: "from-amber-400 to-yellow-500" };
  if (points >= 5000) return { name: "Forest Guardian", min: 5000, max: 10000, color: "from-emerald-400 to-teal-500" };
  if (points >= 2000) return { name: "Eco Warrior", min: 2000, max: 5000, color: "from-violet-400 to-purple-500" };
  if (points >= 500) return { name: "Paper Saver", min: 500, max: 2000, color: "from-blue-400 to-cyan-500" };
  if (points >= 100) return { name: "Green Starter", min: 100, max: 500, color: "from-zinc-400 to-zinc-500" };
  return { name: "Newcomer", min: 0, max: 100, color: "from-zinc-500 to-zinc-600" };
}

export default async function WalletPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [receiptCount, totalSpent, emailConns, merchantConns] = await Promise.all([
    db.receipt.count({ where: { userId } }),
    db.receipt.aggregate({ where: { userId }, _sum: { total: true } }),
    db.emailConnection.count({ where: { userId, isActive: true } }),
    db.merchantConnection.count({ where: { userId, isActive: true } }),
  ]);

  const treesSaved = receiptCount / 8333;
  const co2Saved = receiptCount * 0.0057;
  const points = calculatePoints(receiptCount);
  const level = getLevel(points);
  const levelProgress = Math.min(100, ((points - level.min) / (level.max - level.min)) * 100);

  const REWARDS = [
    { points: 100, label: "Green Starter badge", icon: "🌱", claimed: points >= 100 },
    { points: 500, label: "$1 gift card", icon: "🎁", claimed: points >= 500 },
    { points: 1000, label: "Plant a real tree", icon: "🌳", claimed: points >= 1000 },
    { points: 2000, label: "$5 gift card", icon: "💳", claimed: points >= 2000 },
    { points: 5000, label: "$15 gift card + tree planted", icon: "🌲", claimed: points >= 5000 },
    { points: 10000, label: "$50 gift card + forest badge", icon: "🏆", claimed: points >= 10000 },
  ];

  const MILESTONES = [
    { target: 1, label: "First eReceipt", reward: "+10 pts", icon: "📄" },
    { target: 10, label: "10 Receipts", reward: "+50 bonus", icon: "📋" },
    { target: 25, label: "25 Receipts", reward: "+100 bonus", icon: "📊" },
    { target: 50, label: "Paper Saver", reward: "+250 bonus", icon: "♻️" },
    { target: 100, label: "Eco Warrior", reward: "+500 bonus", icon: "🛡️" },
    { target: 250, label: "Forest Guardian", reward: "+1,000 bonus", icon: "🌿" },
    { target: 500, label: "Carbon Neutral", reward: "+2,500 bonus", icon: "🌍" },
    { target: 1000, label: "Planet Protector", reward: "+5,000 bonus", icon: "🏆" },
  ];

  return (
    <div className="max-w-lg mx-auto">
      {/* Dark header section */}
      <div className="bg-[#0c0c10] rounded-3xl p-6 mb-6 -mx-4 md:mx-0">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white">Your Wallet</h1>
          <p className="text-zinc-500 text-xs mt-1">Save receipts. Earn rewards. Help the planet.</p>
        </div>

        {/* Points + Level */}
        <div className="bg-white/[0.04] backdrop-blur-sm rounded-2xl border border-white/[0.06] p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest">Points</p>
              <p className="text-white text-3xl font-black tabular-nums">{points.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center rounded-full bg-gradient-to-r ${level.color} px-3 py-1 text-[10px] font-bold text-white shadow-lg`}>
                {level.name}
              </span>
            </div>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${level.color} transition-all duration-1000`}
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <p className="text-zinc-600 text-[10px] mt-1.5 text-right">
            {(level.max - points).toLocaleString()} pts to next level
          </p>
        </div>

        {/* Impact row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/[0.04] rounded-xl p-3 text-center border border-white/[0.06]">
            <p className="text-emerald-400 text-lg font-black tabular-nums">
              {treesSaved >= 0.01 ? treesSaved.toFixed(2) : "0"}
            </p>
            <p className="text-zinc-500 text-[9px] uppercase tracking-wider mt-0.5">Trees</p>
          </div>
          <div className="bg-white/[0.04] rounded-xl p-3 text-center border border-white/[0.06]">
            <p className="text-violet-400 text-lg font-black tabular-nums">{receiptCount}</p>
            <p className="text-zinc-500 text-[9px] uppercase tracking-wider mt-0.5">eReceipts</p>
          </div>
          <div className="bg-white/[0.04] rounded-xl p-3 text-center border border-white/[0.06]">
            <p className="text-cyan-400 text-lg font-black tabular-nums">
              {co2Saved >= 1 ? co2Saved.toFixed(1) : (co2Saved * 1000).toFixed(0)}
            </p>
            <p className="text-zinc-500 text-[9px] uppercase tracking-wider mt-0.5">
              {co2Saved >= 1 ? "kg CO₂" : "g CO₂"}
            </p>
          </div>
        </div>
      </div>

      {/* Wallet card */}
      <WalletCard
        userName={session!.user!.name ?? "Member"}
        userEmail={session!.user!.email ?? ""}
        receiptCount={receiptCount}
        totalSpent={totalSpent._sum.total ?? 0}
        treesSaved={treesSaved}
        paperSaved={receiptCount}
        co2Saved={co2Saved}
        connectedSources={emailConns + merchantConns}
        memberSince={new Date().getFullYear().toString()}
      />

      {/* Rewards Store */}
      <div className="mt-6 bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Rewards</h2>
            <p className="text-[10px] text-zinc-400 mt-0.5">Earn points for every receipt</p>
          </div>
          <span className="text-xs font-bold text-violet-600">{points.toLocaleString()} pts</span>
        </div>
        <div className="divide-y divide-zinc-50">
          {REWARDS.map((reward) => {
            const canClaim = points >= reward.points && !reward.claimed;
            const locked = points < reward.points;
            return (
              <div key={reward.points} className="px-5 py-3.5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                  reward.claimed ? "bg-emerald-50" : locked ? "bg-zinc-50" : "bg-violet-50"
                }`}>
                  {reward.icon}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${locked ? "text-zinc-400" : "text-zinc-900"}`}>
                    {reward.label}
                  </p>
                  <p className="text-[10px] text-zinc-400">{reward.points.toLocaleString()} points</p>
                </div>
                {reward.claimed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Earned
                  </span>
                ) : canClaim ? (
                  <span className="inline-flex items-center rounded-full bg-violet-600 px-3 py-1 text-[10px] font-bold text-white">
                    Claim
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-400">
                    {(reward.points - points).toLocaleString()} more
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestones */}
      <div className="mt-6 bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Milestones</h2>
          <p className="text-[10px] text-zinc-400 mt-0.5">Complete milestones for bonus points</p>
        </div>
        <div className="p-5 space-y-4">
          {MILESTONES.map((m) => {
            const reached = receiptCount >= m.target;
            const progress = Math.min(100, (receiptCount / m.target) * 100);
            return (
              <div key={m.target} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${
                  reached ? "bg-emerald-50" : "bg-zinc-50"
                }`}>
                  {reached ? (
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <span>{m.icon}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-xs font-medium ${reached ? "text-zinc-900" : "text-zinc-500"}`}>{m.label}</p>
                    <span className={`text-[10px] font-semibold ${reached ? "text-emerald-600" : "text-zinc-400"}`}>
                      {m.reward}
                    </span>
                  </div>
                  {!reached && (
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                  {!reached && (
                    <p className="text-[9px] text-zinc-400 mt-0.5">{receiptCount}/{m.target} receipts</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add to Wallet */}
      <div className="mt-6 bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-3">Add to Phone Wallet</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-5 py-3 text-sm font-medium text-zinc-400 cursor-not-allowed">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Coming Soon
          </div>
          <a
            href="/api/wallet/google"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white border-2 border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Add to Google Wallet
          </a>
        </div>
      </div>
    </div>
  );
}
