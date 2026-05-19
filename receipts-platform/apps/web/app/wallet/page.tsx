"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function PassPreview() {
  return (
    <div className="mx-auto w-72 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
      {/* Pass card mockup */}
      <div className="bg-[#242D28] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#7BE899] flex items-center justify-center text-[#242D28] font-bold text-sm">
              R
            </div>
            <span className="text-[#F7F6F2] font-semibold text-sm">Receiptiles</span>
          </div>
          <div className="text-[#82907A] text-[10px] uppercase tracking-wider">Digital Receipts</div>
        </div>
        <div className="border-t border-white/10 pt-4">
          <div className="text-[#82907A] text-[10px] uppercase tracking-wider mb-1">Last Purchase</div>
          <div className="text-[#F7F6F2] text-lg font-medium">Ready to tap</div>
        </div>
        <div className="flex justify-between mt-4 pt-3 border-t border-white/10">
          <div>
            <div className="text-[#82907A] text-[9px] uppercase">This Month</div>
            <div className="text-[#7BE899] text-sm font-semibold">$0.00</div>
          </div>
          <div>
            <div className="text-[#82907A] text-[9px] uppercase">Receipts</div>
            <div className="text-[#7BE899] text-sm font-semibold">0</div>
          </div>
          <div>
            <div className="text-[#82907A] text-[9px] uppercase">Trees Saved</div>
            <div className="text-[#7BE899] text-sm font-semibold">0</div>
          </div>
        </div>
      </div>
      {/* QR area */}
      <div className="bg-[#1a211d] p-4 flex justify-center">
        <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center">
          <svg className="w-8 h-8 text-[#82907A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ConfettiAnimation() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number; color: string }>>([]);

  useEffect(() => {
    const colors = ["#7BE899", "#F7F6F2", "#E8C47B", "#82907A", "#4A5D4E"];
    const newParticles = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-full animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti-fall {
          animation: confetti-fall 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
      `}</style>
    </div>
  );
}

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
      }
      // On success, the session will update and the page will re-render
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#7BE899] text-[#242D28] text-xl font-bold mb-4">
          R
        </div>
        <h1 className="text-2xl font-bold text-[#F7F6F2]">Add to Wallet</h1>
        <p className="mt-2 text-sm text-[#82907A]">Sign in to get your Receiptiles pass</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/wallet" })}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-3 text-sm font-medium text-[#F7F6F2] hover:bg-white/[0.06] transition-colors mb-6"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.06]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[#242D28] px-3 text-[#82907A] uppercase tracking-wider">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-4 py-3 text-sm text-[#F7F6F2] placeholder:text-[#82907A] focus:outline-none focus:ring-2 focus:ring-[#7BE899]/30 focus:border-[#7BE899]/50 transition-colors"
          />
        </div>
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={8}
            className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-4 py-3 text-sm text-[#F7F6F2] placeholder:text-[#82907A] focus:outline-none focus:ring-2 focus:ring-[#7BE899]/30 focus:border-[#7BE899]/50 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-[#7BE899] py-3 text-sm text-[#242D28] font-semibold hover:bg-[#6dd884] transition-all disabled:opacity-50"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="text-center text-xs text-[#82907A] mt-6">
        Don&apos;t have an account?{" "}
        <a href="/signup" className="text-[#7BE899] hover:underline">
          Sign up
        </a>
      </p>
    </div>
  );
}

function WalletAddFlow() {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [hasExistingPass, setHasExistingPass] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  // Check if user already has a pass
  useEffect(() => {
    fetch("/api/wallet/add", { method: "GET" })
      .then((r) => {
        if (r.ok) return r.json();
        return null;
      })
      .then((data) => {
        if (data?.hasPass) {
          setHasExistingPass(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleAdd = useCallback(async (targetPlatform: "apple" | "google") => {
    setIsAdding(true);

    try {
      const res = await fetch("/api/wallet/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: targetPlatform }),
      });

      if (!res.ok) {
        throw new Error("Failed to create pass");
      }

      const data = await res.json();

      if (targetPlatform === "apple" && data.passUrl) {
        // Open the .pkpass file or Apple Wallet link
        window.location.href = data.passUrl;
      } else if (targetPlatform === "google" && data.passUrl) {
        // Open Google Save to Wallet
        window.open(data.passUrl, "_blank");
      }

      setAdded(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err) {
      console.error("Wallet add error:", err);
    } finally {
      setIsAdding(false);
    }
  }, []);

  if (added || hasExistingPass) {
    return (
      <div className="text-center">
        {showConfetti && <ConfettiAnimation />}

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#7BE899]/20 mb-6">
          <svg className="w-8 h-8 text-[#7BE899]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-[#F7F6F2] mb-2">
          {hasExistingPass && !added ? "Pass already added" : "You're all set!"}
        </h2>
        <p className="text-[#82907A] text-sm mb-8 max-w-xs mx-auto">
          {hasExistingPass && !added
            ? "Your Receiptiles pass is active in your wallet. Tap at any terminal to receive receipts."
            : "Tap at any Receiptiles terminal to receive digital receipts instantly. No manual selection needed."}
        </p>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 max-w-sm mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#7BE899]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#7BE899]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-[#F7F6F2] text-sm font-medium">How it works</div>
              <div className="text-[#82907A] text-xs">Auto-presents on NFC tap</div>
            </div>
          </div>
          <p className="text-[#82907A] text-xs leading-relaxed">
            When you hold your phone near a Receiptiles terminal, your wallet automatically shows your pass.
            The receipt is delivered digitally — no paper, no app to open.
          </p>
        </div>

        <a
          href="/dashboard"
          className="inline-block mt-8 px-6 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[#F7F6F2] text-sm font-medium hover:bg-white/[0.08] transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#7BE899] text-[#242D28] text-xl font-bold mb-4">
          R
        </div>
        <h1 className="text-2xl font-bold text-[#F7F6F2] mb-2">Add to Wallet</h1>
        <p className="text-[#82907A] text-sm max-w-xs mx-auto">
          Add your Receiptiles pass to automatically receive digital receipts when you tap at checkout.
        </p>
      </div>

      {/* Pass preview */}
      <div className="mb-8">
        <PassPreview />
      </div>

      {/* Wallet buttons */}
      <div className="space-y-3 max-w-xs mx-auto">
        {(platform === "ios" || platform === "desktop") && (
          <button
            onClick={() => handleAdd("apple")}
            disabled={isAdding}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-black border border-white/20 py-3.5 px-6 hover:bg-zinc-900 transition-colors disabled:opacity-50"
          >
            <svg className="h-8 w-auto" viewBox="0 0 120 40" fill="none">
              <rect width="120" height="40" rx="6" fill="black" />
              <path d="M25.5 19.8c0-2.4 1.3-4.2 3.4-5.2-.6-.9-1.7-1.5-3.2-1.5-1.4 0-2.9.8-3.4.8-.6 0-1.9-.8-3-.8-2.4 0-4.8 2-4.8 5.7 0 2.3.9 4.7 2 6.3.9 1.3 1.6 2.3 2.8 2.3 1.1 0 1.6-.7 2.9-.7 1.4 0 1.7.7 2.9.7 1.2 0 2-1.1 2.8-2.3.5-.8.9-1.6 1.1-2-.1 0-2.5-1-2.5-3.3z" fill="white" />
              <path d="M23.5 11.8c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z" fill="white" />
              <text x="38" y="16" fill="white" fontSize="7" fontFamily="system-ui" fontWeight="500">Add to</text>
              <text x="38" y="28" fill="white" fontSize="12" fontFamily="system-ui" fontWeight="600">Apple Wallet</text>
            </svg>
          </button>
        )}

        {(platform === "android" || platform === "desktop") && (
          <button
            onClick={() => handleAdd("google")}
            disabled={isAdding}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white border border-zinc-200 py-3.5 px-6 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            <svg className="h-8 w-auto" viewBox="0 0 154 40" fill="none">
              <rect width="154" height="40" rx="6" fill="white" />
              <path d="M21.5 20.5c0 2.5-1.8 4.3-4.1 4.3-2.3 0-4.1-1.8-4.1-4.3s1.8-4.3 4.1-4.3c2.3 0 4.1 1.8 4.1 4.3z" fill="#4285F4" />
              <path d="M30.5 20.5c0 2.5-1.8 4.3-4.1 4.3-2.3 0-4.1-1.8-4.1-4.3s1.8-4.3 4.1-4.3c2.3 0 4.1 1.8 4.1 4.3z" fill="#EA4335" />
              <path d="M39.3 16.5v7.2c0 3-1.8 4.2-3.8 4.2-2 0-3.1-1.3-3.1-1.3" stroke="#FBBC04" strokeWidth="1.5" fill="none" />
              <circle cx="39" cy="20.5" r="3.8" fill="#FBBC04" />
              <circle cx="47" cy="20.5" r="3.8" fill="#34A853" />
              <text x="56" y="15" fill="#5f6368" fontSize="7" fontFamily="system-ui" fontWeight="400">Save to</text>
              <text x="56" y="27" fill="#3c4043" fontSize="11" fontFamily="system-ui" fontWeight="600">Google Wallet</text>
            </svg>
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mt-4 flex items-center justify-center gap-2 text-[#82907A] text-sm">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Creating your pass...
        </div>
      )}

      {/* Info section */}
      <div className="mt-10 bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 max-w-sm mx-auto text-left">
        <h3 className="text-[#F7F6F2] text-sm font-medium mb-3">How automatic tap works</h3>
        <ul className="space-y-2.5 text-xs text-[#82907A]">
          <li className="flex items-start gap-2">
            <span className="inline-block w-4 h-4 rounded-full bg-[#7BE899]/10 text-[#7BE899] text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span>Hold your phone near a Receiptiles terminal at checkout</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="inline-block w-4 h-4 rounded-full bg-[#7BE899]/10 text-[#7BE899] text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span>Your wallet automatically presents the Receiptiles pass</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="inline-block w-4 h-4 rounded-full bg-[#7BE899]/10 text-[#7BE899] text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span>Your receipt appears digitally — no paper, no app needed</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  return (
    <div className="min-h-screen bg-[#242D28] flex items-center justify-center p-4">
      {/* Background gradient effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#7BE899]/5 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[#7BE899]/3 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md py-12">
        {isLoading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-[#7BE899]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : session?.user ? (
          <WalletAddFlow />
        ) : (
          <LoginForm />
        )}
      </div>
    </div>
  );
}
