"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  clientId: string;
  appName: string;
  redirectUri: string;
  scopes: string[];
  state: string;
}

export function ConsentForm({ userId, clientId, appName, redirectUri, scopes, state }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAllow = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/oauth/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, scopes, redirectUri }),
      });

      const data = await res.json();

      if (data.code) {
        // Redirect back to app with authorization code
        const url = new URL(redirectUri);
        url.searchParams.set("code", data.code);
        url.searchParams.set("state", state);
        window.location.href = url.toString();
      }
    } catch (err) {
      console.error("Grant failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = () => {
    const url = new URL(redirectUri);
    url.searchParams.set("error", "access_denied");
    url.searchParams.set("state", state);
    window.location.href = url.toString();
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={handleDeny}
        className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 text-neutral-600 font-semibold text-sm hover:bg-neutral-50"
      >
        Deny
      </button>
      <button
        onClick={handleAllow}
        disabled={loading}
        className="flex-1 px-4 py-3 rounded-xl bg-neutral-900 text-white font-semibold text-sm hover:bg-neutral-800 disabled:opacity-50"
      >
        {loading ? "..." : "Allow Access"}
      </button>
    </div>
  );
}
