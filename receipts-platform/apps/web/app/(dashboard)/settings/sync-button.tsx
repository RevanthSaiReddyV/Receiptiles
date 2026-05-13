"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [result, setResult] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const router = useRouter();

  async function handleSync() {
    setStatus("syncing");
    setResult(null);
    setLogs([]);
    setShowDetails(false);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullRescan: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setResult(data.error || "Sync failed");
        return;
      }

      setStatus("done");
      setResult(`Imported ${data.imported} receipt${data.imported !== 1 ? "s" : ""}`);
      if (data.logs) setLogs(data.logs);
      router.refresh();
    } catch {
      setStatus("error");
      setResult("Network error");
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSync}
          disabled={status === "syncing"}
          className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "syncing" ? (
            <>
              <svg className="mr-1.5 h-3 w-3 animate-spin text-zinc-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Syncing...
            </>
          ) : (
            "Sync Now"
          )}
        </button>
        {result && (
          <span className={`text-xs font-medium ${status === "error" ? "text-red-600" : "text-emerald-600"}`}>
            {result}
          </span>
        )}
      </div>
      {logs.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowDetails((prev) => !prev)}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            {showDetails ? "Hide details" : "Show details"}
          </button>
          {showDetails && (
            <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-zinc-900 p-4 text-xs text-emerald-400 font-mono">
              {logs.join("\n")}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
