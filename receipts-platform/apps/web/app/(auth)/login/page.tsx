import Link from "next/link";
import { cookies } from "next/headers";
import { login } from "@/lib/actions/auth";
import { GoogleSignInButton } from "../google-button";
import { ClearSessionOnMount } from "./clear-session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const { error, reset } = await searchParams;

  // Clear any existing session cookie so a fresh login always works
  const cookieStore = await cookies();
  const sessionCookies = cookieStore.getAll().filter(c =>
    c.name.includes("authjs") || c.name.includes("next-auth")
  );
  const hasExistingSession = sessionCookies.length > 0;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#050507] p-4 overflow-hidden">
      {hasExistingSession && <ClearSessionOnMount />}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-lg font-bold mb-4">
              R
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-zinc-500">Sign in to your Receipts account</p>
          </div>

          {reset === "success" && (
            <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
              Password reset successfully. Sign in with your new password.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {decodeURIComponent(error)}
            </div>
          )}

          <GoogleSignInButton />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#050507] px-3 text-zinc-500 uppercase tracking-wider">or</span>
            </div>
          </div>

          <form action={login} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-400">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="mt-1 block w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-zinc-400">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Enter your password"
                className="mt-1 block w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 py-2.5 text-sm text-white font-medium hover:from-violet-500 hover:to-purple-500 transition-all"
            >
              Sign In
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-white hover:text-violet-400 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
