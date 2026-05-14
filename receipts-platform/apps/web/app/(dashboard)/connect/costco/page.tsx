"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BOOKMARKLET_CODE = `javascript:void(function(){var t=localStorage.getItem('idToken');if(t){window.location='${typeof window !== "undefined" ? window.location.origin : "https://receipts-platform.vercel.app"}/api/connectors/costco/extract-token#'+t}else{alert('Please log into Costco first')}})()`;

export default function ConnectCostcoPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [method, setMethod] = useState<"auto" | "desktop" | "mobile">("auto");
  const [token, setToken] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "syncing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ imported: number; total: number } | null>(null);
  const router = useRouter();

  async function handleConnect() {
    if (!token.trim()) {
      setError("Please paste your Costco token");
      return;
    }

    setStatus("connecting");
    setError(null);

    try {
      const res = await fetch("/api/connectors/costco/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token.trim(), clientId: clientId.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Connection failed");
        setStatus("error");
        return;
      }

      setStep(3);
      setStatus("syncing");

      // Auto-trigger sync
      const syncRes = await fetch("/api/connectors/costco/sync", { method: "POST" });
      const syncData = await syncRes.json();

      if (!syncRes.ok) {
        setError(syncData.error || "Sync failed");
        setStatus("error");
        return;
      }

      setSyncResult({ imported: syncData.imported, total: syncData.total });
      setStatus("done");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <Link href="/email" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Connections
        </Link>
      </div>

      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🏪</div>
        <h1 className="text-2xl font-bold text-zinc-900">Connect Costco</h1>
        <p className="text-sm text-zinc-500 mt-1">Import your warehouse receipts with full item details</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              s < step ? "bg-emerald-100 text-emerald-700" :
              s === step ? "bg-zinc-900 text-white" :
              "bg-zinc-100 text-zinc-400"
            }`}>
              {s < step ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : s}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 ${s < step ? "bg-emerald-300" : "bg-zinc-200"}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="text-xs text-red-600 mt-0.5">{error}</p>
        </div>
      )}

      {/* Method selection */}
      {step === 1 && method === "auto" && (
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">How are you connecting?</h2>
          <div className="space-y-3">
            <button
              onClick={() => setMethod("desktop")}
              className="w-full flex items-center gap-4 rounded-xl border border-zinc-200 p-4 hover:border-violet-300 hover:bg-violet-50/30 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-lg">💻</div>
              <div>
                <p className="text-sm font-medium text-zinc-900">Desktop / Laptop</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Copy token from browser console</p>
              </div>
            </button>
            <button
              onClick={() => setMethod("mobile")}
              className="w-full flex items-center gap-4 rounded-xl border border-zinc-200 p-4 hover:border-violet-300 hover:bg-violet-50/30 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-lg">📱</div>
              <div>
                <p className="text-sm font-medium text-zinc-900">Phone / Tablet</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Use bookmarklet to connect automatically</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Mobile flow */}
      {step === 1 && method === "mobile" && (
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Connect from your phone</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-zinc-500">1</span>
              </div>
              <div>
                <p className="text-sm text-zinc-700">Save this as a bookmark on your phone:</p>
                <p className="text-[10px] text-zinc-400 mt-1">Long-press the link below → &quot;Add Bookmark&quot; or &quot;Add to Favorites&quot;</p>
                <a
                  href={BOOKMARKLET_CODE}
                  className="mt-2 inline-block rounded-lg bg-violet-100 px-4 py-2 text-xs font-semibold text-violet-700"
                  onClick={(e) => { e.preventDefault(); alert("Long-press this link and save it as a bookmark. Name it 'Connect Costco'."); }}
                >
                  📌 Connect Costco (save as bookmark)
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-zinc-500">2</span>
              </div>
              <div>
                <p className="text-sm text-zinc-700">Open <a href="https://www.costco.com/myaccount" target="_blank" rel="noopener noreferrer" className="text-violet-600 font-medium">costco.com</a> and log in</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-zinc-500">3</span>
              </div>
              <p className="text-sm text-zinc-700">Once logged in, tap the &quot;Connect Costco&quot; bookmark you saved. It will automatically grab your token and connect your account.</p>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200/60 px-3 py-2">
              <p className="text-[11px] text-amber-700">
                <strong>Alternative:</strong> Open <a href="/api/connectors/costco/extract-token" target="_blank" className="text-amber-800 underline">this link</a> in the same browser where you&apos;re logged into Costco, and paste your token manually.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setMethod("auto")} className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
              Back
            </button>
            <button onClick={() => { setMethod("desktop"); }} className="flex-1 rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
              Use Desktop Instead
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Log into Costco (Desktop flow) */}
      {step === 1 && method === "desktop" && (
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Step 1: Log into Costco</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-zinc-500">1</span>
              </div>
              <div>
                <p className="text-sm text-zinc-700">Open a new tab and go to</p>
                <a href="https://www.costco.com/myaccount" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-violet-600 hover:text-violet-700">
                  costco.com/myaccount →
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-zinc-500">2</span>
              </div>
              <p className="text-sm text-zinc-700">Sign in with your Costco membership account</p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-zinc-500">3</span>
              </div>
              <p className="text-sm text-zinc-700">Make sure you can see your account page, then come back here</p>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="mt-6 w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            I&apos;m logged into Costco
          </button>
        </div>
      )}

      {/* Step 2: Extract token */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Step 2: Copy your session token</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-zinc-500">1</span>
              </div>
              <div>
                <p className="text-sm text-zinc-700">On the Costco tab, open your browser&apos;s Developer Console:</p>
                <div className="mt-1 flex gap-2">
                  <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-mono font-medium text-zinc-700">
                    Mac: ⌘ + Option + J
                  </span>
                  <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-mono font-medium text-zinc-700">
                    Windows: Ctrl + Shift + J
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-zinc-500">2</span>
              </div>
              <div>
                <p className="text-sm text-zinc-700">Paste this command in the console and press Enter:</p>
                <div className="mt-2 relative">
                  <pre className="bg-zinc-900 rounded-lg p-3 text-xs text-emerald-400 font-mono overflow-x-auto">
                    copy(localStorage.getItem(&apos;idToken&apos;))
                  </pre>
                  <button
                    onClick={() => navigator.clipboard.writeText("copy(localStorage.getItem('idToken'))")}
                    className="absolute top-2 right-2 rounded bg-zinc-700 px-2 py-1 text-[9px] text-zinc-300 hover:bg-zinc-600"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">This copies your Costco login token to your clipboard</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-zinc-500">3</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-zinc-700 mb-2">Paste the token here:</p>
                <textarea
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="Paste your Costco token here..."
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100 resize-none"
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-zinc-500">4</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-zinc-700 mb-2">Optional — also run this and paste the Client ID:</p>
                <pre className="bg-zinc-900 rounded-lg p-3 text-xs text-emerald-400 font-mono overflow-x-auto mb-2">
                  copy(localStorage.getItem(&apos;clientID&apos;))
                </pre>
                <input
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  placeholder="Client ID (optional)"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-emerald-50 border border-emerald-200/60 px-3 py-2 mt-4">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <p className="text-[11px] text-emerald-700">
                This token only accesses your order history. We never see your Costco password.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConnect}
              disabled={!token.trim() || status === "connecting" || status === "syncing"}
              className="flex-1 rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {status === "connecting" ? "Connecting..." : status === "syncing" ? "Syncing..." : "Connect & Sync"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 text-center">
          {status === "syncing" && (
            <>
              <svg className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <h2 className="text-sm font-semibold text-zinc-900">Importing your Costco receipts...</h2>
              <p className="text-xs text-zinc-400 mt-1">This may take a minute</p>
            </>
          )}

          {status === "done" && syncResult && (
            <>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">Costco Connected!</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Imported {syncResult.imported} new receipt{syncResult.imported !== 1 ? "s" : ""}
                {syncResult.total > syncResult.imported && ` (${syncResult.total - syncResult.imported} already existed)`}
              </p>
              <button
                onClick={() => router.push("/receipts")}
                className="mt-6 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
              >
                View Receipts
              </button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-zinc-900">Sync Failed</h2>
              <p className="text-xs text-zinc-500 mt-1">{error}</p>
              <button
                onClick={() => { setStep(2); setStatus("idle"); setError(null); }}
                className="mt-4 text-xs text-violet-600 hover:text-violet-700 font-medium"
              >
                Try again
              </button>
            </>
          )}
        </div>
      )}

      {/* What you get */}
      <div className="mt-6 bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-5">
        <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-3">What you get</h3>
        <div className="space-y-2">
          {[
            "Full item-level receipts with SKU numbers",
            "Every warehouse visit with exact items and prices",
            "Tax breakdown and coupon/discount details",
            "Payment method and card information",
            "Historical data going back years",
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="text-xs text-zinc-600">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
