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

  const cookieStore = await cookies();
  const sessionCookies = cookieStore.getAll().filter(c =>
    c.name.includes("authjs") || c.name.includes("next-auth")
  );
  const hasExistingSession = sessionCookies.length > 0;

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden bg-[#242D28]">
      {hasExistingSession && <ClearSessionOnMount />}

      {/* Animated gradient blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#7BE899]/15 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[#4A5D4E]/20 blur-[100px]" />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-[#E8C47B]/10 blur-[80px] animate-pulse" style={{ animationDuration: "4s" }} />

      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundSize: "60px 60px", backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)" }} />

      {/* Logo */}
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 z-20">
        <div className="w-8 h-8 rounded-lg bg-[#7BE899] flex items-center justify-center text-[#242D28] text-sm font-bold">R</div>
        <span className="text-white font-semibold tracking-wide text-sm">Receiptiles</span>
      </Link>

      <div className="relative z-10 w-full max-w-md">
        {/* Glass card */}
        <div className="rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-[#A0AFAA]">Sign in to your account</p>
          </div>

          {reset === "success" && (
            <div className="mb-5 rounded-xl bg-[#7BE899]/10 border border-[#7BE899]/20 px-4 py-3 text-sm text-[#7BE899] flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Password reset successfully. Sign in with your new password.
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {decodeURIComponent(error)}
            </div>
          )}

          <GoogleSignInButton />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#242D28] px-3 text-[#82907A] uppercase tracking-wider font-medium">or continue with email</span>
            </div>
          </div>

          <form action={login} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#A0AFAA] uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="block w-full rounded-xl bg-white/[0.05] border border-white/[0.1] px-4 py-3 text-sm text-white placeholder:text-[#82907A] focus:outline-none focus:ring-2 focus:ring-[#7BE899]/30 focus:border-[#7BE899]/40 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-[#A0AFAA] uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#7BE899] hover:text-white transition-colors font-medium"
                >
                  Forgot?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Enter your password"
                className="block w-full rounded-xl bg-white/[0.05] border border-white/[0.1] px-4 py-3 text-sm text-white placeholder:text-[#82907A] focus:outline-none focus:ring-2 focus:ring-[#7BE899]/30 focus:border-[#7BE899]/40 transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#7BE899] py-3 text-sm text-[#1C1C1A] font-bold hover:bg-white transition-all shadow-lg shadow-[#7BE899]/20 hover:shadow-white/20 active:scale-[0.98]"
            >
              Sign In
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#82907A] mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-[#7BE899] hover:text-white transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
