import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@receipts/db";
import { DeveloperPortal } from "./developer-portal";

export default async function DevelopersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Get existing API keys for this user
  const apiKeys = await db.dataApiKey.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  // Get usage stats
  const grants = await db.dataApiGrant.findMany({
    where: { appId: { in: apiKeys.map((k) => k.partnerId) } },
    select: { appId: true, scopes: true, grantedAt: true },
  });

  return (
    <DeveloperPortal
      apiKeys={apiKeys.map((k) => ({
        id: k.id,
        partnerId: k.partnerId,
        partnerName: k.partnerName,
        key: k.key,
        tier: k.tier,
        active: k.active,
        createdAt: k.createdAt.toISOString(),
        requestCount: k.requestCount ?? 0,
      }))}
      grantCount={grants.length}
    />
  );
}
