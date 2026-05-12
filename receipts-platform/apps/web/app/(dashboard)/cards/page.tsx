import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { addCard, addRewardRule } from "@/lib/actions/cards";

export const dynamic = 'force-dynamic';

export default async function CardsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const cards = await db.userCard.findMany({
    where: { userId },
    include: { rewardRules: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Cards & Rewards</h1>
      <p className="mt-1 text-gray-600">
        Add your credit cards and reward rules to get best-card recommendations.
      </p>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Add a Card</h2>
        <form action={addCard} className="mt-3 flex gap-2 flex-wrap">
          <input
            name="name"
            placeholder="Card name (e.g., Chase Sapphire)"
            required
            className="flex-1 min-w-[200px] rounded-lg border px-3 py-2 text-sm"
          />
          <input
            name="last4"
            placeholder="Last 4"
            required
            maxLength={4}
            className="w-20 rounded-lg border px-3 py-2 text-sm"
          />
          <select name="network" className="rounded-lg border px-3 py-2 text-sm">
            <option value="visa">Visa</option>
            <option value="mastercard">Mastercard</option>
            <option value="amex">Amex</option>
            <option value="discover">Discover</option>
            <option value="other">Other</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Add Card
          </button>
        </form>
      </div>

      <div className="mt-8 space-y-6">
        {cards.map((card) => (
          <div key={card.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{card.name}</p>
                <p className="text-sm text-gray-500">
                  {card.network.toUpperCase()} **** {card.last4}
                </p>
              </div>
            </div>

            {card.rewardRules.length > 0 && (
              <div className="mt-3 space-y-1">
                {card.rewardRules.map((rule) => (
                  <p key={rule.id} className="text-sm text-gray-600">
                    {rule.rewardRate}% {rule.rewardType}{" "}
                    {rule.merchantName
                      ? `at ${rule.merchantName}`
                      : rule.category
                        ? `on ${rule.category}`
                        : "on all purchases"}
                  </p>
                ))}
              </div>
            )}

            <form action={addRewardRule} className="mt-3 flex gap-2 flex-wrap">
              <input type="hidden" name="cardId" value={card.id} />
              <input
                name="category"
                placeholder="Category (optional)"
                className="flex-1 min-w-[120px] rounded border px-2 py-1 text-sm"
              />
              <input
                name="rewardRate"
                type="number"
                step="0.1"
                placeholder="Rate %"
                required
                className="w-20 rounded border px-2 py-1 text-sm"
              />
              <select name="rewardType" className="rounded border px-2 py-1 text-sm">
                <option value="cashback">Cashback</option>
                <option value="points">Points</option>
                <option value="miles">Miles</option>
              </select>
              <button
                type="submit"
                className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
              >
                Add Rule
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
