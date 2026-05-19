"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { WalletMateReader, ConnectionStatus } from "@/lib/nfc/walletmate";
import { performNFCHandover, generateFakeSerial } from "@/lib/nfc/handover";

interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

interface TapRecord {
  id: number;
  serialNumber: string;
  claimUrl: string;
  timestamp: Date;
  status: "pending" | "claimed" | "expired";
}

const DEMO_MERCHANTS = [
  { name: "Starbucks", amount: 12.58 },
  { name: "Whole Foods", amount: 87.32 },
  { name: "Target", amount: 45.99 },
  { name: "Trader Joe's", amount: 63.21 },
  { name: "Chipotle", amount: 14.75 },
  { name: "CVS Pharmacy", amount: 28.49 },
  { name: "Costco", amount: 156.80 },
  { name: "Walmart", amount: 72.14 },
];

export default function NFCTestPage() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [taps, setTaps] = useState<TapRecord[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const readerRef = useRef<WalletMateReader | null>(null);
  const logIdRef = useRef(0);
  const tapIdRef = useRef(0);
  const logPanelRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    const entry: LogEntry = {
      id: ++logIdRef.current,
      timestamp: new Date(),
      message,
      type,
    };
    setLogs((prev) => [...prev.slice(-100), entry]); // Keep last 100 entries
  }, []);

  // Auto-scroll log panel
  useEffect(() => {
    if (logPanelRef.current) {
      logPanelRef.current.scrollTop = logPanelRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCardDetected = useCallback(
    async (uid: Uint8Array, ndefText?: string) => {
      const serialNumber = ndefText ?? `rcpt_${Array.from(uid).map((b) => b.toString(16).padStart(2, "0")).join("")}`;

      addLog(`Tag detected: ${serialNumber}`, "success");
      addLog("Calling nfc-handover API...", "info");

      try {
        const result = await performNFCHandover(serialNumber, {
          apiKey: apiKey || undefined,
        });

        addLog(`Claim URL generated: ${result.claimUrl}`, "success");

        const tap: TapRecord = {
          id: ++tapIdRef.current,
          serialNumber,
          claimUrl: result.claimUrl,
          timestamp: new Date(),
          status: "claimed",
        };
        setTaps((prev) => [tap, ...prev.slice(0, 19)]); // Keep last 20
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        addLog(`Handover failed: ${msg}`, "error");
      }
    },
    [apiKey, addLog]
  );

  const connectReader = async () => {
    if (!WalletMateReader.isSupported()) {
      addLog("Web Bluetooth is not supported in this browser. Use Chrome or Edge.", "error");
      return;
    }

    const reader = new WalletMateReader({
      onStatusChange: setStatus,
      onConnect: () => addLog("Connected to ACR1255U-J1", "success"),
      onDisconnect: () => addLog("Device disconnected", "warning"),
      onCardDetected: (data, ndefText) => handleCardDetected(data, ndefText),
      onError: (err) => addLog(`Error: ${err.message}`, "error"),
      onLog: (msg) => addLog(msg),
    });

    readerRef.current = reader;

    try {
      await reader.connect();
      await reader.startPolling();
    } catch (error) {
      // Error already logged via onError callback
    }
  };

  const disconnectReader = () => {
    readerRef.current?.disconnect();
    readerRef.current = null;
  };

  const simulateTap = async () => {
    setIsSimulating(true);
    const serial = generateFakeSerial();

    addLog(`[SIM] Simulated tap detected: ${serial}`, "info");
    addLog("[SIM] Calling nfc-handover API...", "info");

    try {
      const result = await performNFCHandover(serial, {
        apiKey: apiKey || undefined,
      });

      addLog(`[SIM] Claim URL generated: ${result.claimUrl}`, "success");

      const tap: TapRecord = {
        id: ++tapIdRef.current,
        serialNumber: serial,
        claimUrl: result.claimUrl,
        timestamp: new Date(),
        status: "claimed",
      };
      setTaps((prev) => [tap, ...prev.slice(0, 19)]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      addLog(`[SIM] Handover failed: ${msg}`, "error");
    } finally {
      setIsSimulating(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const clearLogs = () => setLogs([]);

  const statusColors: Record<ConnectionStatus, string> = {
    disconnected: "bg-zinc-500",
    connecting: "bg-amber-500 animate-pulse",
    connected: "bg-emerald-500",
    reading: "bg-emerald-500 animate-pulse",
    error: "bg-red-500",
  };

  const statusLabels: Record<ConnectionStatus, string> = {
    disconnected: "Disconnected",
    connecting: "Connecting...",
    connected: "Connected",
    reading: "Reading...",
    error: "Error",
  };

  const isWebBluetoothSupported = typeof navigator !== "undefined" && "bluetooth" in navigator;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-[#1C1C1A] rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7BE899] to-emerald-600 flex items-center justify-center">
              <NFCIcon />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#F7F6F2]">NFC Terminal Simulator</h1>
              <p className="text-xs text-zinc-500">Receiptiles tap-to-receive test utility</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2 bg-white/[0.05] rounded-full px-3 py-1.5">
              <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
              <span className="text-xs font-medium text-zinc-300">{statusLabels[status]}</span>
            </div>

            {/* Connect/Disconnect button */}
            {status === "disconnected" || status === "error" ? (
              <button
                onClick={connectReader}
                className="inline-flex items-center gap-2 rounded-lg bg-[#7BE899] px-4 py-2 text-sm font-semibold text-[#1C1C1A] hover:bg-[#6BD884] transition-colors"
              >
                <BluetoothIcon />
                Connect WalletMate 2
              </button>
            ) : (
              <button
                onClick={disconnectReader}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Browser compatibility notice */}
        {!isWebBluetoothSupported && (
          <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-xs text-amber-400">
              Web Bluetooth is not available in this browser. Use Chrome or Edge on desktop, or Chrome on Android.
              Safari and Firefox do not support Web Bluetooth.
            </p>
          </div>
        )}

        {/* API Key input */}
        <div className="mt-4 flex items-center gap-3">
          <label className="text-xs text-zinc-500 whitespace-nowrap">Device API Key:</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="dk_... (leave blank for simulated mode)"
            className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-[#7BE899]/50"
          />
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* NFC Tap Zone */}
        <div className="bg-[#1C1C1A] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[280px]">
          <div
            className={`w-40 h-40 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-500 ${
              status === "reading"
                ? "border-[#7BE899] bg-[#7BE899]/5 shadow-[0_0_40px_rgba(123,232,153,0.1)]"
                : "border-zinc-700 bg-white/[0.02]"
            }`}
          >
            <div className="text-center">
              <div className={`mx-auto mb-2 transition-transform duration-500 ${status === "reading" ? "scale-110" : ""}`}>
                <NFCLargeIcon active={status === "reading"} />
              </div>
              <p className={`text-sm font-medium ${status === "reading" ? "text-[#7BE899]" : "text-zinc-500"}`}>
                {status === "reading" ? "TAP YOUR PHONE" : "Not polling"}
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-500">
              {status === "reading"
                ? "Hold your phone near the WalletMate 2 reader"
                : status === "connected"
                ? "Connected - start polling to begin reading"
                : "Connect the reader to begin"}
            </p>
          </div>

          {/* Simulate button */}
          <button
            onClick={simulateTap}
            disabled={isSimulating}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-500/20 border border-violet-500/30 px-4 py-2 text-sm font-medium text-violet-300 hover:bg-violet-500/30 transition-colors disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <LoadingSpinner />
                Simulating...
              </>
            ) : (
              <>
                <SimulateIcon />
                Simulate Tap
              </>
            )}
          </button>
        </div>

        {/* Status Panel */}
        <div className="bg-[#1C1C1A] rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[#F7F6F2] mb-4">Connection Details</h2>

          <div className="space-y-3">
            <StatusRow label="Device" value={readerRef.current?.deviceName ?? "Not connected"} />
            <StatusRow label="Protocol" value="ACR1255U-J1 BLE" />
            <StatusRow label="Status" value={statusLabels[status]} highlight={status === "reading"} />
            <StatusRow label="Mode" value={apiKey ? "Live (API Key set)" : "Simulated"} />
            <StatusRow label="Total Taps" value={String(taps.length)} />
            <StatusRow
              label="Last Read"
              value={taps.length > 0 ? taps[0].serialNumber.slice(0, 20) + "..." : "(none)"}
            />
          </div>

          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              {status === "connected" && (
                <button
                  onClick={() => readerRef.current?.startPolling()}
                  className="text-xs bg-[#7BE899]/20 text-[#7BE899] px-3 py-1.5 rounded-lg hover:bg-[#7BE899]/30 transition-colors"
                >
                  Start Polling
                </button>
              )}
              {status === "reading" && (
                <button
                  onClick={() => readerRef.current?.stopPolling()}
                  className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/30 transition-colors"
                >
                  Stop Polling
                </button>
              )}
              <button
                onClick={clearLogs}
                className="text-xs bg-white/[0.05] text-zinc-400 px-3 py-1.5 rounded-lg hover:bg-white/[0.08] transition-colors"
              >
                Clear Logs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Event Log */}
      <div className="bg-[#1C1C1A] rounded-2xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#F7F6F2]">Event Log</h2>
          <span className="text-[10px] text-zinc-600">{logs.length} entries</span>
        </div>
        <div
          ref={logPanelRef}
          className="h-48 overflow-y-auto p-4 font-mono text-xs space-y-1 scroll-smooth"
        >
          {logs.length === 0 ? (
            <p className="text-zinc-600 italic">No events yet. Connect the reader or simulate a tap to begin.</p>
          ) : (
            logs.map((entry) => (
              <div key={entry.id} className="flex gap-2">
                <span className="text-zinc-600 flex-shrink-0">
                  {entry.timestamp.toLocaleTimeString("en-US", { hour12: false })}
                </span>
                <span className={`${logTypeColor(entry.type)}`}>
                  {logTypePrefix(entry.type)}
                </span>
                <span className={`${logTypeColor(entry.type)} break-all`}>{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Taps */}
      <div className="bg-[#1C1C1A] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#F7F6F2]">Recent Taps</h2>
          {taps.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#7BE899]/10 px-2 py-0.5 text-[10px] font-medium text-[#7BE899]">
              {taps.length} total
            </span>
          )}
        </div>
        <div className="divide-y divide-white/[0.04]">
          {taps.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-zinc-600 text-sm">No taps recorded yet</p>
              <p className="text-zinc-700 text-xs mt-1">Tap a phone or use "Simulate Tap" to test</p>
            </div>
          ) : (
            taps.slice(0, 10).map((tap) => {
              const merchant = DEMO_MERCHANTS[tap.id % DEMO_MERCHANTS.length];
              const timeAgo = getTimeAgo(tap.timestamp);
              return (
                <div key={tap.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-[#7BE899]/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#7BE899]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#F7F6F2]">
                        {merchant.name}
                      </p>
                      <span className="text-xs text-zinc-500">${merchant.amount.toFixed(2)}</span>
                      <span className="text-[10px] text-zinc-600">{timeAgo}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-mono truncate">
                      {tap.serialNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => copyUrl(tap.claimUrl)}
                    className={`flex-shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
                      copiedUrl === tap.claimUrl
                        ? "bg-[#7BE899]/20 text-[#7BE899]"
                        : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-300"
                    }`}
                  >
                    {copiedUrl === tap.claimUrl ? (
                      <>Copied</>
                    ) : (
                      <>
                        <CopyIcon />
                        Copy URL
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-6 text-center">
        <p className="text-[10px] text-zinc-500">
          WalletMate 2 (ACR1255U-J1) | Web Bluetooth API | Receiptiles NFC Protocol
        </p>
      </div>
    </div>
  );
}

// --- Helper components ---

function StatusRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-xs font-medium ${highlight ? "text-[#7BE899]" : "text-zinc-300"}`}>{value}</span>
    </div>
  );
}

function logTypeColor(type: LogEntry["type"]): string {
  switch (type) {
    case "success":
      return "text-[#7BE899]";
    case "error":
      return "text-red-400";
    case "warning":
      return "text-amber-400";
    default:
      return "text-zinc-400";
  }
}

function logTypePrefix(type: LogEntry["type"]): string {
  switch (type) {
    case "success":
      return "[OK]";
    case "error":
      return "[ERR]";
    case "warning":
      return "[WARN]";
    default:
      return ">";
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

// --- Icons ---

function NFCIcon() {
  return (
    <svg className="w-5 h-5 text-[#1C1C1A]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
    </svg>
  );
}

function NFCLargeIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`w-12 h-12 ${active ? "text-[#7BE899]" : "text-zinc-600"}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
    </svg>
  );
}

function BluetoothIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l10 10-5 5V2l5 5L7 17" />
    </svg>
  );
}

function SimulateIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
