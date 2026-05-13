import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#050507] p-4 overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-600/20 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-orange-600/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-lg font-bold mb-4">
              R
            </div>
            <h1 className="text-2xl font-bold text-white">Reset your password</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          {sent && (
            <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
              If an account exists with that email, we&apos;ve sent a password reset link.
              Check your inbox.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {decodeURIComponent(error)}
            </div>
          )}

          {!sent && (
            <form action={requestPasswordReset} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-400">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="mt-1 block w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 py-2.5 text-sm text-white font-medium hover:from-amber-500 hover:to-orange-500 transition-all"
              >
                Send Reset Link
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-white hover:text-amber-400 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
