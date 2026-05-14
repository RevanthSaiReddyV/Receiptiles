"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface RetailerInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  loginUrl: string;
  tokenKey: string;
  clientIdKey?: string;
  description: string;
}

const RETAILERS: Record<string, RetailerInfo> = {
  amazon: { id: "amazon", name: "Amazon", icon: "📦", color: "#FF9900", loginUrl: "https://www.amazon.com/gp/css/order-history", tokenKey: "session-id", description: "All your Amazon orders with item details" },
  walmart: { id: "walmart", name: "Walmart", icon: "🏪", color: "#0071DC", loginUrl: "https://www.walmart.com/account/wmpurchasehistory", tokenKey: "auth_token", description: "In-store and online Walmart purchases" },
  target: { id: "target", name: "Target", icon: "🎯", color: "#CC0000", loginUrl: "https://www.target.com/orders", tokenKey: "accessToken", description: "Target Circle purchases and orders" },
  costco: { id: "costco", name: "Costco", icon: "🏬", color: "#E31837", loginUrl: "https://www.costco.com/myaccount", tokenKey: "idToken", clientIdKey: "clientID", description: "Warehouse receipts with full item details" },
  "sams-club": { id: "sams-club", name: "Sam's Club", icon: "🏬", color: "#0060A9", loginUrl: "https://www.samsclub.com/account/orders", tokenKey: "access_token", description: "Sam's Club purchases and Scan & Go" },
  kroger: { id: "kroger", name: "Kroger", icon: "🛒", color: "#E35205", loginUrl: "https://www.kroger.com/mypurchases", tokenKey: "ktoken", description: "Kroger and affiliated store purchases" },
  "whole-foods": { id: "whole-foods", name: "Whole Foods", icon: "🥦", color: "#00674B", loginUrl: "https://www.amazon.com/gp/css/order-history", tokenKey: "session-id", description: "Whole Foods orders via Amazon" },
  safeway: { id: "safeway", name: "Safeway", icon: "🛒", color: "#E8372C", loginUrl: "https://www.safeway.com/account/purchase-history", tokenKey: "SWY_SHARED_SESSION", description: "Safeway purchase history" },
  publix: { id: "publix", name: "Publix", icon: "🛒", color: "#3D8B37", loginUrl: "https://www.publix.com/shop/history", tokenKey: "token", description: "Publix online and in-store orders" },
  "trader-joes": { id: "trader-joes", name: "Trader Joe's", icon: "🌺", color: "#DA291C", loginUrl: "https://www.traderjoes.com", tokenKey: "token", description: "Trader Joe's doesn't have online accounts — use receipt upload instead" },
  instacart: { id: "instacart", name: "Instacart", icon: "🥕", color: "#43B02A", loginUrl: "https://www.instacart.com/store/account/orders", tokenKey: "token", description: "All Instacart delivery orders" },
  doordash: { id: "doordash", name: "DoorDash", icon: "🍕", color: "#FF3008", loginUrl: "https://www.doordash.com/orders", tokenKey: "token", description: "DoorDash delivery orders and DashPass" },
  "uber-eats": { id: "uber-eats", name: "Uber Eats", icon: "🍔", color: "#06C167", loginUrl: "https://www.ubereats.com/orders", tokenKey: "token", description: "Uber Eats orders and receipts" },
  grubhub: { id: "grubhub", name: "Grubhub", icon: "🍟", color: "#F63440", loginUrl: "https://www.grubhub.com/account/orders", tokenKey: "token", description: "Grubhub delivery orders" },
  uber: { id: "uber", name: "Uber", icon: "🚗", color: "#000000", loginUrl: "https://riders.uber.com/trips", tokenKey: "token", description: "Uber ride receipts and history" },
  lyft: { id: "lyft", name: "Lyft", icon: "🚗", color: "#FF00BF", loginUrl: "https://www.lyft.com/ride-history", tokenKey: "token", description: "Lyft ride receipts" },
  starbucks: { id: "starbucks", name: "Starbucks", icon: "☕", color: "#00704A", loginUrl: "https://app.starbucks.com/account/history", tokenKey: "token", description: "Starbucks orders and rewards" },
  chipotle: { id: "chipotle", name: "Chipotle", icon: "🌯", color: "#A81612", loginUrl: "https://www.chipotle.com/order-history", tokenKey: "token", description: "Chipotle orders and rewards" },
  "chick-fil-a": { id: "chick-fil-a", name: "Chick-fil-A", icon: "🐔", color: "#E51636", loginUrl: "https://www.chick-fil-a.com/account/order-history", tokenKey: "token", description: "Chick-fil-A orders and rewards" },
  "home-depot": { id: "home-depot", name: "Home Depot", icon: "🔨", color: "#F96302", loginUrl: "https://www.homedepot.com/order/view/activity", tokenKey: "THD_SESSION", description: "Home Depot purchases and Pro Xtra" },
  lowes: { id: "lowes", name: "Lowe's", icon: "🔧", color: "#004990", loginUrl: "https://www.lowes.com/mylowes/orders", tokenKey: "token", description: "Lowe's purchases and MyLowe's" },
  "best-buy": { id: "best-buy", name: "Best Buy", icon: "🖥️", color: "#0046BE", loginUrl: "https://www.bestbuy.com/purchasehistory", tokenKey: "token", description: "Best Buy orders and Totaltech" },
  apple: { id: "apple", name: "Apple", icon: "🍎", color: "#000000", loginUrl: "https://reportaproblem.apple.com", tokenKey: "token", description: "App Store, iTunes, Apple subscriptions" },
  cvs: { id: "cvs", name: "CVS", icon: "💊", color: "#CC0000", loginUrl: "https://www.cvs.com/account/purchase-history", tokenKey: "token", description: "CVS pharmacy and store purchases" },
  walgreens: { id: "walgreens", name: "Walgreens", icon: "💊", color: "#E31837", loginUrl: "https://www.walgreens.com/youraccount/purchasehistory", tokenKey: "token", description: "Walgreens purchases and Balance Rewards" },
};

export default function ConnectRetailerPage() {
  const params = useParams();
  const router = useRouter();
  const retailerId = params.retailerId as string;
  const retailer = RETAILERS[retailerId];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [token, setToken] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "syncing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ imported: number } | null>(null);

  if (!retailer) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <p className="text-4xl mb-4">🔍</p>
        <h1 className="text-xl font-bold text-zinc-900">Retailer not found</h1>
        <p className="text-sm text-zinc-500 mt-2">"{retailerId}" is not a supported retailer</p>
        <Link href="/connections" className="mt-4 inline-block text-sm text-violet-600 hover:text-violet-700 font-medium">Back to Connections</Link>
      </div>
    );
  }

  async function handleConnect() {
    if (!token.trim()) { setError("Please paste your token"); return; }
    setStatus("connecting");
    setError(null);

    try {
      const res = await fetch("/api/connectors/costco/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: token.trim(),
          clientId: clientId.trim() || undefined,
          retailer: retailerId,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Connection failed"); setStatus("error"); return; }

      setStep(3);
      setStatus("done");
      setSyncResult({ imported: 0 });
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  const consoleCmd = `copy(localStorage.getItem('${retailer.tokenKey}'))`;

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <Link href="/connections" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Connections
        </Link>
      </div>

      <div className="text-center mb-8">
        <div className="text-4xl mb-3">{retailer.icon}</div>
        <h1 className="text-2xl font-bold text-zinc-900">Connect {retailer.name}</h1>
        <p className="text-sm text-zinc-500 mt-1">{retailer.description}</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              s < step ? "bg-emerald-100 text-emerald-700" : s === step ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-400"
            }`}>
              {s < step ? "✓" : s}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 ${s < step ? "bg-emerald-300" : "bg-zinc-200"}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Step 1: Log into {retailer.name}</h2>
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">Open a new tab and sign in:</p>
            <a href={retailer.loginUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl text-sm font-medium text-white px-4 py-2.5 transition-colors"
              style={{ backgroundColor: retailer.color }}>
              Open {retailer.name} →
            </a>
            <p className="text-xs text-zinc-400">Sign in with your {retailer.name} account, then come back here</p>
          </div>
          <button onClick={() => setStep(2)} className="mt-6 w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800">
            I&apos;m logged in
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Step 2: Copy your session token</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-zinc-700 mb-2">On the {retailer.name} tab, open Developer Console:</p>
              <div className="flex gap-2 mb-3">
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-mono text-zinc-700">Mac: ⌘+Option+J</span>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-mono text-zinc-700">Win: Ctrl+Shift+J</span>
              </div>
            </div>

            <div>
              <p className="text-sm text-zinc-700 mb-2">Paste this command and press Enter:</p>
              <div className="relative">
                <pre className="bg-zinc-900 rounded-lg p-3 text-xs text-emerald-400 font-mono overflow-x-auto">
                  {consoleCmd}
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(consoleCmd)}
                  className="absolute top-2 right-2 rounded bg-zinc-700 px-2 py-1 text-[9px] text-zinc-300 hover:bg-zinc-600"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm text-zinc-700 mb-2">Paste the result here:</p>
              <textarea
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder={`Paste your ${retailer.name} token here...`}
                rows={3}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100 resize-none"
              />
            </div>

            {retailer.clientIdKey && (
              <div>
                <p className="text-sm text-zinc-700 mb-1">Optional — also run:</p>
                <pre className="bg-zinc-900 rounded-lg p-2 text-xs text-emerald-400 font-mono mb-2">
                  copy(localStorage.getItem(&apos;{retailer.clientIdKey}&apos;))
                </pre>
                <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Client ID (optional)"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100" />
              </div>
            )}

            <div className="rounded-lg bg-emerald-50 border border-emerald-200/60 px-3 py-2">
              <p className="text-[11px] text-emerald-700 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                This only accesses your order history. We never see your password.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">Back</button>
            <button onClick={handleConnect} disabled={!token.trim() || status === "connecting"}
              className="flex-1 rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
              {status === "connecting" ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 text-center">
          {status === "done" ? (
            <>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">{retailer.name} Connected!</h2>
              <p className="text-sm text-zinc-500 mt-1">Your receipts will sync automatically</p>
              <button onClick={() => router.push("/connections")} className="mt-6 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800">
                Back to Connections
              </button>
            </>
          ) : (
            <>
              <svg className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-zinc-500">Connecting to {retailer.name}...</p>
            </>
          )}
        </div>
      )}

      {/* What you get */}
      <div className="mt-6 bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-5">
        <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-3">What you get</h3>
        <div className="space-y-2">
          {["Full order history with items and prices", "Automatic daily sync for new purchases", "Tax and discount breakdowns", "Card reward optimization per purchase"].map((item, i) => (
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
