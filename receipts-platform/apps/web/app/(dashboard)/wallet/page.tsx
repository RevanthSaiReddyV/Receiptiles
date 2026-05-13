import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { WalletCard } from "./wallet-card";

export const dynamic = 'force-dynamic';

export default async function WalletPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [receiptCount, totalSpent, emailConns, merchantConns] = await Promise.all([
    db.receipt.count({ where: { userId } }),
    db.receipt.aggregate({ where: { userId }, _sum: { total: true } }),
    db.emailConnection.count({ where: { userId, isActive: true } }),
    db.merchantConnection.count({ where: { userId, isActive: true } }),
  ]);

  // Trees saved calculation:
  // Average receipt = 1 sheet of paper
  // 1 tree = ~8,333 sheets of paper (EPA estimate)
  // So trees saved = receiptCount / 8333
  const treesSaved = receiptCount / 8333;
  const paperSaved = receiptCount; // sheets
  const co2Saved = receiptCount * 0.0057; // kg CO2 per receipt (EPA)

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">Your eReceipt Wallet</h1>
        <p className="mt-1 text-sm text-zinc-500">Your impact, in one card</p>
      </div>

      <WalletCard
        userName={session!.user!.name ?? "Cardholder"}
        userEmail={session!.user!.email ?? ""}
        receiptCount={receiptCount}
        totalSpent={totalSpent._sum.total ?? 0}
        treesSaved={treesSaved}
        paperSaved={paperSaved}
        co2Saved={co2Saved}
        connectedSources={emailConns + merchantConns}
        memberSince={session!.user!.id ? new Date().getFullYear().toString() : "2026"}
      />

      {/* Impact stats */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <ImpactStat
          icon="🌳"
          value={treesSaved >= 1 ? treesSaved.toFixed(1) : (treesSaved * 100).toFixed(0) + "%"}
          label={treesSaved >= 1 ? "Trees Saved" : "of a Tree"}
          sublabel={`${receiptCount} receipts`}
        />
        <ImpactStat
          icon="📄"
          value={paperSaved.toLocaleString()}
          label="Sheets Saved"
          sublabel={`${(paperSaved * 0.005).toFixed(1)} kg paper`}
        />
        <ImpactStat
          icon="💨"
          value={co2Saved >= 1 ? co2Saved.toFixed(1) : (co2Saved * 1000).toFixed(0)}
          label={co2Saved >= 1 ? "kg CO₂ Saved" : "g CO₂ Saved"}
          sublabel="carbon offset"
        />
      </div>

      {/* Milestones */}
      <div className="mt-8 bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">Milestones</h2>
        <div className="space-y-3">
          <Milestone reached={receiptCount >= 1} label="First eReceipt" target={1} current={receiptCount} />
          <Milestone reached={receiptCount >= 10} label="10 Receipts — Getting Started" target={10} current={receiptCount} />
          <Milestone reached={receiptCount >= 50} label="50 Receipts — Paper Saver" target={50} current={receiptCount} />
          <Milestone reached={receiptCount >= 100} label="100 Receipts — Eco Warrior" target={100} current={receiptCount} />
          <Milestone reached={receiptCount >= 500} label="500 Receipts — Forest Guardian" target={500} current={receiptCount} />
          <Milestone reached={receiptCount >= 1000} label="1,000 Receipts — Planet Protector" target={1000} current={receiptCount} />
        </div>
      </div>
    </div>
  );
}

function ImpactStat({ icon, value, label, sublabel }: { icon: string; value: string; label: string; sublabel: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-xl font-bold text-zinc-900">{value}</p>
      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-[9px] text-zinc-400 mt-0.5">{sublabel}</p>
    </div>
  );
}

function Milestone({ reached, label, target, current }: { reached: boolean; label: string; target: number; current: number }) {
  const progress = Math.min(100, (current / target) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${reached ? "bg-emerald-100" : "bg-zinc-100"}`}>
        {reached ? (
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <span className="text-[9px] font-bold text-zinc-400">{target}</span>
        )}
      </div>
      <div className="flex-1">
        <p className={`text-xs font-medium ${reached ? "text-zinc-900" : "text-zinc-500"}`}>{label}</p>
        {!reached && (
          <div className="mt-1 h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
