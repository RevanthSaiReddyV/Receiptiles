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

function PassCard() {
  return (
    <div className="relative w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: "1.6/1" }}>
      {/* Forest background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a2e1f] via-[#1c3322] to-[#0f1f14]">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=500&fit=crop')", backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
      </div>

      {/* Pass content */}
      <div className="relative z-10 h-full p-5 flex flex-col justify-between">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-[#E8C47B]/90 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#1C1C1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-white text-xs font-bold tracking-wider uppercase">TapForReceipts</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7BE899]/20 border border-[#7BE899]/30 text-[#7BE899] text-[9px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7BE899]"></span> Eco Active
            </span>
          </div>
          <div className="text-right flex items-center gap-1.5">
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
            </svg>
            <div>
              <div className="text-white text-2xl font-black leading-none">247</div>
              <div className="text-white/50 text-[8px] uppercase tracking-wider">Receipts</div>
            </div>
          </div>
        </div>

        {/* Middle — this month */}
        <div>
          <div className="text-white/50 text-[9px] uppercase tracking-widest mb-0.5">This Month</div>
          <div className="flex items-baseline gap-1">
            <span className="text-white text-4xl font-black">18</span>
            <span className="text-white/70 text-sm">receipts</span>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-white/40 text-[8px] uppercase tracking-wider">Trees Saved</div>
            <div className="text-white text-lg font-bold">3.2</div>
            <div className="text-white/50 text-[9px] font-mono mt-0.5">TFR •• 2023 •• 0247</div>
            <div className="text-white/50 text-[9px] uppercase tracking-wider">Jordan Nakamura</div>
          </div>
          <div className="text-center">
            <div className="text-white/40 text-[8px] uppercase tracking-wider">Paper Avoided</div>
            <div className="text-white text-lg font-bold">1.4 kg</div>
          </div>
          <div className="text-right">
            <div className="text-white/40 text-[8px] uppercase tracking-wider">CO₂ Saved</div>
            <div className="text-white text-lg font-bold">0.82 kg</div>
            <div className="w-6 h-6 rounded-full bg-[#4A5D4E] ml-auto mt-1 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[#7BE899]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12s1.5 2 4 2 4-2 4-2" />
                <path d="M12 6v2M8 8l1 1M16 8l-1 1" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentReceipts() {
  const receipts = [
    { icon: "☕", color: "bg-orange-100", merchant: "Blue Bottle Coffee", time: "Today, 08:41", amount: "$6.50" },
    { icon: "🛒", color: "bg-green-100", merchant: "Whole Foods Market", time: "Yesterday, 17:22", amount: "$84.30" },
    { icon: "🥐", color: "bg-red-100", merchant: "Tartine Bakery", time: "May 22, 12:05", amount: "$23.00" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 mt-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[#1C1C1A] font-semibold text-sm">Recent Receipts</h3>
        <span className="text-[#7BE899] text-xs font-semibold">No paper</span>
      </div>
      <p className="text-zinc-400 text-xs mb-4">18 this month · 247 total · all digital</p>

      <div className="space-y-3">
        {receipts.map((r, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${r.color} flex items-center justify-center text-sm`}>
                {r.icon}
              </div>
              <div>
                <div className="text-[#1C1C1A] text-sm font-medium">{r.merchant}</div>
                <div className="text-zinc-400 text-xs">{r.time}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[#1C1C1A] text-sm font-semibold">{r.amount}</div>
              <div className="text-[#7BE899] text-[10px] flex items-center gap-0.5 justify-end">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                paper saved
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-4 text-center text-[#4A5D4E] text-xs font-medium hover:text-[#1C1C1A] transition-colors">
        Show all 6 receipts ↓
      </button>
    </div>
  );
}

function EnvironmentalImpact() {
  const stats = [
    { icon: "🌱", value: "3.2", unit: "trees", label: "Trees Saved" },
    { icon: "📄", value: "1.4", unit: "kg", label: "Paper Avoided" },
    { icon: "💨", value: "0.82", unit: "kg", label: "CO₂ Saved" },
    { icon: "📅", value: "Jan", unit: "2023", label: "Member Since" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 mt-4">
      <h3 className="text-[#1C1C1A] font-semibold text-sm mb-1">Your Environmental Impact</h3>
      <p className="text-zinc-400 text-xs mb-5">Every receipt you skip makes a difference</p>

      <div className="grid grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="text-center">
            <div className="w-10 h-10 rounded-full bg-[#EAF0E6] flex items-center justify-center mx-auto mb-2 text-sm">
              {s.icon}
            </div>
            <div className="text-[#1C1C1A] text-lg font-bold leading-none">{s.value}</div>
            <div className="text-zinc-400 text-[10px]">{s.unit}</div>
            <div className="text-zinc-500 text-[10px] font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WalletButtons({ onAdd, isAdding, platform }: { onAdd: (p: "apple" | "google") => void; isAdding: boolean; platform: Platform }) {
  return (
    <div className="mt-6 space-y-3">
      {(platform === "ios" || platform === "desktop") && (
        <button
          onClick={() => onAdd("apple")}
          disabled={isAdding}
          className="w-full flex items-center justify-center gap-3 rounded-2xl bg-[#1C1C1A] py-4 px-6 hover:bg-black transition-colors disabled:opacity-50 shadow-lg"
        >
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.5 8.5h-3V7a2.5 2.5 0 00-5 0v1.5h-3A1.5 1.5 0 007 10v9a1.5 1.5 0 001.5 1.5h11A1.5 1.5 0 0021 19v-9a1.5 1.5 0 00-1.5-1.5zM13 7a1 1 0 012 0v1.5h-2V7z" />
          </svg>
          <span className="text-white font-semibold text-sm">Add to Apple Wallet</span>
        </button>
      )}

      {(platform === "android" || platform === "desktop") && (
        <button
          onClick={() => onAdd("google")}
          disabled={isAdding}
          className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white border-2 border-zinc-200 py-4 px-6 hover:bg-zinc-50 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span className="text-[#1C1C1A] font-semibold text-sm">Save to Google Wallet</span>
        </button>
      )}

      {isAdding && (
        <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm pt-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Creating your pass...
        </div>
      )}
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
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) setError("Invalid email or password.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#7BE899] text-[#242D28] text-xl font-bold mb-4">R</div>
        <h1 className="text-2xl font-bold text-[#F7F6F2]">Add to Wallet</h1>
        <p className="mt-2 text-sm text-[#82907A]">Sign in to get your TapForReceipts pass</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/get-pass" })}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-white/[0.05] border border-white/[0.1] px-4 py-3 text-sm font-medium text-white hover:bg-white/[0.08] transition-colors mb-6"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.08]" /></div>
        <div className="relative flex justify-center text-xs"><span className="bg-[#242D28] px-3 text-[#82907A] uppercase tracking-wider">or</span></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required className="w-full rounded-xl bg-white/[0.05] border border-white/[0.1] px-4 py-3 text-sm text-white placeholder:text-[#82907A] focus:outline-none focus:ring-2 focus:ring-[#7BE899]/30 transition-colors" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={8} className="w-full rounded-xl bg-white/[0.05] border border-white/[0.1] px-4 py-3 text-sm text-white placeholder:text-[#82907A] focus:outline-none focus:ring-2 focus:ring-[#7BE899]/30 transition-colors" />
        <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-[#7BE899] py-3 text-sm text-[#242D28] font-semibold hover:bg-white transition-all disabled:opacity-50">
          {isLoading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="text-center text-xs text-[#82907A] mt-6">
        Don&apos;t have an account? <a href="/signup" className="text-[#7BE899] hover:underline">Sign up</a>
      </p>
    </div>
  );
}

function WalletAddFlow() {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => { setPlatform(detectPlatform()); }, []);

  const handleAdd = useCallback(async (targetPlatform: "apple" | "google") => {
    setIsAdding(true);
    try {
      const res = await fetch("/api/wallet/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: targetPlatform }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.passUrl) {
        if (targetPlatform === "apple") window.location.href = data.passUrl;
        else window.open(data.passUrl, "_blank");
      }
      setAdded(true);
      localStorage.setItem("receiptiles_wallet_added", Date.now().toString());
    } catch (err) {
      console.error("Wallet add error:", err);
    } finally {
      setIsAdding(false);
    }
  }, []);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Pass status */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-[#7BE899]"></span>
          Pass active · purchase data written to back
        </div>
        <span className="text-xs text-zinc-400">Updated just now</span>
      </div>

      {/* Pass card */}
      <PassCard />

      {/* Recent receipts */}
      <RecentReceipts />

      {/* Environmental impact */}
      <EnvironmentalImpact />

      {/* Wallet buttons */}
      {!added ? (
        <WalletButtons onAdd={handleAdd} isAdding={isAdding} platform={platform} />
      ) : (
        <div className="mt-6 text-center p-4 rounded-2xl bg-[#EAF0E6] border border-[#CFDCC8]">
          <div className="flex items-center justify-center gap-2 text-[#4A5D4E] font-semibold text-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            Pass added to your wallet!
          </div>
          <p className="text-xs text-[#82907A] mt-1">Tap at any terminal to receive receipts instantly.</p>
        </div>
      )}
    </div>
  );
}

export default function WalletPage() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  return (
    <div className="min-h-screen bg-[#F5F5F0] p-4 md:p-8">
      {/* Header */}
      <div className="max-w-md mx-auto mb-6 flex items-center justify-between">
        <a href="/" className="text-[#4A5D4E] text-sm font-medium flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          Wallet
        </a>
        <span className="text-[#1C1C1A] font-semibold text-sm">TapForReceipts</span>
        <div className="w-6" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <svg className="animate-spin h-8 w-8 text-[#7BE899]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : session?.user ? (
        <WalletAddFlow />
      ) : (
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="bg-[#242D28] rounded-3xl p-8 w-full max-w-md">
            <LoginForm />
          </div>
        </div>
      )}
    </div>
  );
}
