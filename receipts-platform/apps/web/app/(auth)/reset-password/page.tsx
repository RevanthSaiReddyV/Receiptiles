import Link from "next/link";
import { resetPassword } from "@/lib/actions/auth";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white p-8 shadow-xl shadow-neutral-200/50 border border-neutral-200/60 text-center">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Invalid link</h1>
            <p className="text-sm text-neutral-500 mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-neutral-900 hover:underline"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl shadow-neutral-200/50 border border-neutral-200/60">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-900 text-white text-lg font-bold mb-4">
              R
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">Set new password</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Enter your new password below
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={resetPassword} className="space-y-4">
            <input type="hidden" name="token" value={token} />

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                placeholder="Repeat your password"
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm text-white font-medium hover:bg-neutral-800 transition-colors"
            >
              Reset Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
