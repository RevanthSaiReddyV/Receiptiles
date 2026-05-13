"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleSync() {
    setStatus("syncing");
    setResult(null);

    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setResult(data.error || "Sync failed");
        return;
      }

      setStatus("done");
      setResult(`Imported ${data.imported} receipt${data.imported !== 1 ? "s" : ""}`);
      router.refresh();
    } catch {
      setStatus("error");
      setResult("Network error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={status === "syncing"}
        className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "syncing" ? "Syncing..." : "Sync Now"}
      </button>
      {result && (
        <span className={`text-xs ${status === "error" ? "text-red-600" : "text-green-600"}`}>
          {result}
        </span>
      )}
    </div>
  );
}
