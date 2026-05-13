import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DeleteAccountButton } from "./delete-account-button";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your account</p>
      </div>

      {/* Profile */}
      <section className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">Profile</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center">
              <span className="text-white text-lg font-bold">
                {(session.user.name?.charAt(0) ?? session.user.email?.charAt(0) ?? "U").toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-zinc-900">{session.user.name ?? "No name set"}</p>
              <p className="text-sm text-zinc-500">{session.user.email}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100">
          <h2 className="font-semibold text-red-900">Danger Zone</h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-zinc-600 mb-4">
            Permanently delete your account and all data. This cannot be undone.
          </p>
          <DeleteAccountButton />
        </div>
      </section>
    </div>
  );
}
