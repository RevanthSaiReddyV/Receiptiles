"use client";

import { useState, useEffect } from "react";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

interface WalletPromptProps {
  onSkip?: () => void;
  onAdded?: () => void;
}

/**
 * Post-signup wallet prompt component.
 * Shows a prompt to add the Receiptiles pass to Apple/Google Wallet
 * immediately after account creation.
 */
export function WalletPrompt({ onSkip, onAdded }: WalletPromptProps) {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [isAdding, setIsAdding] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const handleAdd = async (targetPlatform: "apple" | "google") => {
    setIsAdding(true);

    try {
      const res = await fetch("/api/wallet/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: targetPlatform }),
      });

      if (!res.ok) throw new Error("Failed to create pass");

      const data = await res.json();

      if (targetPlatform === "apple" && data.passUrl) {
        window.location.href = data.passUrl;
      } else if (targetPlatform === "google" && data.passUrl) {
        window.open(data.passUrl, "_blank");
      }

      onAdded?.();
    } catch (err) {
      console.error("Wallet add error:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleSkip = () => {
    // Store preference in localStorage
    try {
      localStorage.setItem("receiptiles_wallet_skipped", "true");
    } catch {}
    setSkipped(true);
    onSkip?.();
  };

  if (skipped) return null;

  return (
    <div className="w-full max-w-sm mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
        {/* NFC icon */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#7BE899]/10 mb-4">
          <svg className="w-6 h-6 text-[#7BE899]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
          </svg>
        </div>

        <h2 className="text-lg font-bold text-[#F7F6F2] mb-1">
          One last thing — add your receipt card
        </h2>
        <p className="text-sm text-[#82907A] mb-6">
          This lets you tap and receive receipts instantly, no app needed.
        </p>

        {/* Platform-appropriate button */}
        <div className="space-y-3">
          {(platform === "ios" || platform === "desktop") && (
            <button
              onClick={() => handleAdd("apple")}
              disabled={isAdding}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-black border border-white/20 py-3 px-6 hover:bg-zinc-900 transition-colors disabled:opacity-50"
            >
              <svg className="h-7 w-auto" viewBox="0 0 120 40" fill="none">
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
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white border border-zinc-200 py-3 px-6 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              <svg className="h-7 w-auto" viewBox="0 0 154 40" fill="none">
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
          <div className="mt-3 flex items-center justify-center gap-2 text-[#82907A] text-xs">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Creating your pass...
          </div>
        )}

        {/* Skip link */}
        <button
          onClick={handleSkip}
          className="mt-4 text-xs text-[#82907A] hover:text-[#F7F6F2] transition-colors underline underline-offset-2"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
