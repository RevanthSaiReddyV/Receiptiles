import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl shadow-neutral-200/50 border border-neutral-200/60">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-900 text-white text-lg font-bold mb-4">
              R
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">Reset your password</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          {sent && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              If an account exists with that email, we&apos;ve sent a password reset link.
              Check your inbox.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {decodeURIComponent(error)}
            </div>
          )}

          {!sent && (
            <form action={requestPasswordReset} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm text-white font-medium hover:bg-neutral-800 transition-colors"
              >
                Send Reset Link
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-neutral-500 mt-6">
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-neutral-900 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
