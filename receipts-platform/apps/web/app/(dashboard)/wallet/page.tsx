"use client";

import { useEffect, useState, useCallback } from "react";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

interface DevicePass {
  id: string;
  platform: string;
  deviceName: string | null;
  deviceType: string | null;
  osName: string | null;
  browserName: string | null;
  createdAt: string;
}

export default function DashboardWalletPage() {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [devices, setDevices] = useState<DevicePass[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    fetch("/api/wallet/add")
      .then((r) => r.json())
      .then((data) => {
        if (data.devices) setDevices(data.devices);
      })
      .catch(() => {});
  }, []);

  const handleAdd = useCallback(async (targetPlatform: "apple" | "google") => {
    setIsAdding(true);
    try {
      const res = await fetch("/api/wallet/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: targetPlatform,
          deviceName: navigator.userAgent.match(/iPhone|iPad|Mac|Android|Windows|Pixel/)?.[0] || "Device",
          deviceType: /Mobi/.test(navigator.userAgent) ? "mobile" : "desktop",
          osName: /iPhone|iPad/.test(navigator.userAgent) ? "iOS" : /Android/.test(navigator.userAgent) ? "Android" : /Mac/.test(navigator.userAgent) ? "macOS" : "Other",
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          browserName: /Chrome/.test(navigator.userAgent) ? "Chrome" : /Safari/.test(navigator.userAgent) ? "Safari" : "Other",
          userAgent: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (data.passUrl) {
        if (targetPlatform === "apple") window.location.href = data.passUrl;
        else window.open(data.passUrl, "_blank");
        setAdded(true);
      } else {
        // Pass created but can't download yet (Apple certs not configured)
        setAdded(true);
      }
      localStorage.setItem("receiptiles_wallet_added", Date.now().toString());
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Wallet Pass</h1>
        <p className="text-sm text-zinc-500 mt-1">Add your Receiptiles pass to Apple or Google Wallet for instant tap-to-receive.</p>
      </div>

      {/* Add to Wallet */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Add to this device</h2>
        <div className="flex flex-wrap gap-3">
          {(platform === "ios" || platform === "desktop") && (
            <button
              onClick={() => handleAdd("apple")}
              disabled={isAdding}
              className="px-5 py-3 bg-black text-white rounded-xl text-sm font-medium border border-white/10 hover:bg-zinc-900 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              {added ? "Added" : "Add to Apple Wallet"}
            </button>
          )}
          {(platform === "android" || platform === "desktop") && (
            <button
              onClick={() => handleAdd("google")}
              disabled={isAdding}
              className="px-5 py-3 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {added ? "Added" : "Save to Google Wallet"}
            </button>
          )}
        </div>
      </div>

      {/* Connected Devices */}
      {devices.length > 0 && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Connected Devices ({devices.length})</h2>
          <div className="space-y-3">
            {devices.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <span className="text-xs">
                      {d.deviceType === "mobile" ? "📱" : d.deviceType === "tablet" ? "📟" : "💻"}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm text-white font-medium">{d.deviceName || "Unknown Device"}</div>
                    <div className="text-[11px] text-zinc-500">{d.osName} • {d.browserName} • {d.platform}</div>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-600">
                  {new Date(d.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-6">
        <h3 className="text-sm font-semibold text-emerald-400 mb-2">How it works</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Your Receiptiles pass lives in your native wallet app. When you tap your phone at a Receiptiles-enabled terminal,
          the pass is automatically presented — no app needed. Each receipt is instantly linked to your account.
        </p>
      </div>
    </div>
  );
}
