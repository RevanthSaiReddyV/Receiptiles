"use client";

import { useState, useCallback } from "react";

export function PlaidLinkButton({ hasConnection }: { hasConnection: boolean }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(hasConnection);
  const [result, setResult] = useState<{ transactionsImported?: number } | null>(null);
  const [error, setError] = useState("");

  const handleConnect = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      // 1. Get link token from our API
      const tokenRes = await fetch("/api/plaid/link-token", { method: "POST" });
      if (!tokenRes.ok) throw new Error("Failed to create link token");
      const { linkToken } = await tokenRes.json();

      // 2. Load Plaid Link
      const { open, exit } = await loadPlaidLink(linkToken);

      // 3. Open Plaid Link UI
      open({
        onSuccess: async (publicToken: string, metadata: Record<string, unknown>) => {
          try {
            const exchangeRes = await fetch("/api/plaid/exchange", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                publicToken,
                institutionName: (metadata as { institution?: { name?: string } })?.institution?.name ?? "Bank",
              }),
            });

            if (!exchangeRes.ok) throw new Error("Exchange failed");
            const data = await exchangeRes.json();
            setIsConnected(true);
            setResult(data);
          } catch {
            setError("Failed to connect bank account. Please try again.");
          }
        },
        onExit: () => {
          setIsLoading(false);
        },
      });
    } catch {
      setError("Failed to initialize bank connection.");
      setIsLoading(false);
    }
  }, []);

  if (isConnected && result) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-green-800 text-sm">Bank Connected</div>
            <div className="text-green-600 text-xs">{result.transactionsImported} transactions imported</div>
          </div>
        </div>
      </div>
    );
  }

  if (isConnected && !result) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">🏦</div>
          <div className="flex-1">
            <div className="font-semibold text-green-800 text-sm">Bank Account Connected</div>
            <div className="text-green-600 text-xs">Transactions sync automatically</div>
          </div>
          <button
            onClick={handleConnect}
            className="text-xs text-green-700 font-medium hover:underline"
          >
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-neutral-900 text-sm">Connect Bank Account</div>
            <div className="text-neutral-500 text-xs">Auto-match transactions with your receipts</div>
          </div>
        </div>
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? "Connecting..." : "Connect"}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
      <p className="text-neutral-400 text-[11px] mt-3">
        Powered by Plaid. Bank-grade encryption. We never store your login credentials.
      </p>
    </div>
  );
}

interface PlaidHandler {
  open: (handlers: { onSuccess: (token: string, metadata: Record<string, unknown>) => void; onExit: () => void }) => void;
  exit: () => void;
}

function loadPlaidLink(linkToken: string): Promise<PlaidHandler> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject("No window");

    const existingScript = document.getElementById("plaid-link-script");
    const init = () => {
      const Plaid = (window as unknown as { Plaid?: { create: (config: Record<string, unknown>) => { open: () => void; exit: () => void } } }).Plaid;
      if (!Plaid) return reject("Plaid SDK not loaded");

      const handler = Plaid.create({
        token: linkToken,
        onSuccess: () => {},
        onExit: () => {},
      });

      resolve({
        open: ({ onSuccess, onExit }) => {
          const h = Plaid.create({
            token: linkToken,
            onSuccess: (public_token: string, metadata: Record<string, unknown>) => onSuccess(public_token, metadata),
            onExit: () => onExit(),
          });
          h.open();
        },
        exit: () => handler.exit?.(),
      });
    };

    if (existingScript) {
      init();
      return;
    }

    const script = document.createElement("script");
    script.id = "plaid-link-script";
    script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    script.onload = init;
    script.onerror = () => reject("Failed to load Plaid SDK");
    document.head.appendChild(script);
  });
}
