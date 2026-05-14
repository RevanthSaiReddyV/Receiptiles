import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ConsentForm } from "./consent-form";

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id: string; app_name: string; redirect_uri: string; scope: string; state: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const scopes = (params.scope ?? "receipts.read").split(" ");

  const SCOPE_DESCRIPTIONS: Record<string, string> = {
    "receipts.read": "View your receipts and purchase history",
    "spending.read": "View spending analytics and trends",
    "items.read": "View individual items purchased",
    "merchants.read": "View your merchant visit history",
    "profile.read": "View your wallet profile",
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-xl font-extrabold text-neutral-900">
            {params.app_name} wants access
          </h1>
          <p className="text-sm text-neutral-500 mt-2">
            to your Receipts account ({session.user.email})
          </p>
        </div>

        <div className="bg-neutral-50 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-neutral-500 uppercase mb-3">
            This app will be able to:
          </p>
          <ul className="space-y-2">
            {scopes.map((scope) => (
              <li key={scope} className="flex items-center gap-2 text-sm text-neutral-700">
                <span className="text-green-500">✓</span>
                {SCOPE_DESCRIPTIONS[scope] ?? scope}
              </li>
            ))}
          </ul>
        </div>

        <ConsentForm
          userId={session.user.id}
          clientId={params.client_id}
          appName={params.app_name}
          redirectUri={params.redirect_uri}
          scopes={scopes}
          state={params.state}
        />

        <p className="text-xs text-neutral-400 text-center mt-4">
          You can revoke access anytime in Settings → Connected Apps
        </p>
      </div>
    </div>
  );
}
