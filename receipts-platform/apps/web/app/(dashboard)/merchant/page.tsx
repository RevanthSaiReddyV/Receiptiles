import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@receipts/db";
import { MerchantDashboard } from "./merchant-dashboard";

export default async function MerchantPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Check if user has merchant keys
  const merchantKeys = await db.dataApiKey.findMany({
    where: { userId: session.user.id, active: true },
  });

  // Get basic stats for each merchant app
  const appStats = await Promise.all(
    merchantKeys.map(async (key) => {
      const recentReceipts = await db.receipt.count({
        where: {
          merchantCanonicalName: { contains: key.partnerName, mode: "insensitive" },
          purchasedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });
      return {
        id: key.id,
        name: key.partnerName,
        partnerId: key.partnerId,
        tier: key.tier,
        receipts30d: recentReceipts,
        requests: key.requestCount ?? 0,
      };
    })
  );

  return <MerchantDashboard apps={appStats} />;
}
