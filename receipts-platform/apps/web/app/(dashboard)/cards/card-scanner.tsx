"use client";

import { useState, useRef, useCallback } from "react";
import { addCardWithPreset } from "@/lib/actions/cards";

interface ScanResult {
  last4: string;
  network: string;
  expMonth: number | null;
  expYear: number | null;
  issuer: string | null;
  cardName: string | null;
  cardholderName: string | null;
  dominantColor: string | null;
}

export function CardScanner({ onDone }: { onDone?: () => void }) {
  const [mode, setMode] = useState<"idle" | "camera" | "scanning" | "confirm">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  async function startCamera() {
    setError(null);
    setMode("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("Camera access denied. You can upload a photo instead.");
      setMode("idle");
    }
  }

  function captureFrame() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPreview(dataUrl);
    stopCamera();
    scanImage(dataUrl);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
      scanImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function scanImage(dataUrl: string) {
    setMode("scanning");
    setError(null);

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const formData = new FormData();
      formData.append("image", blob, "card.jpg");

      const res = await fetch("/api/cards/scan", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not read card");
        setMode("idle");
        return;
      }

      if (!data.last4 || data.last4.length !== 4) {
        setError("Could not read card number. Try again with better lighting.");
        setMode("idle");
        return;
      }

      setResult(data);
      setMode("confirm");
    } catch {
      setError("Scan failed. Please try again.");
      setMode("idle");
    }
  }

  async function saveCard() {
    if (!result) return;
    setSaving(true);

    const name = result.cardName
      ? `${result.issuer ? result.issuer + " " : ""}${result.cardName}`
      : result.issuer
        ? `${result.issuer} Card`
        : `${result.network.toUpperCase()} Card`;

    const formData = new FormData();
    formData.append("name", name);
    formData.append("last4", result.last4);
    formData.append("network", result.network);
    formData.append("preset", "custom");

    try {
      await addCardWithPreset(formData);
      setMode("idle");
      setResult(null);
      setPreview(null);
      onDone?.();
    } catch {
      setError("Failed to save card");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    stopCamera();
    setMode("idle");
    setResult(null);
    setPreview(null);
    setError(null);
  }

  if (mode === "idle") {
    return (
      <div>
        {error && (
          <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-700">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={startCamera}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            Scan Card
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload Photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>
    );
  }

  if (mode === "camera") {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
        <div className="relative bg-black aspect-[16/10]">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {/* Card overlay guide */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[80%] aspect-[3.375/2.125] border-2 border-white/50 rounded-2xl" />
          </div>
          <p className="absolute bottom-3 left-0 right-0 text-center text-white/70 text-xs">
            Align your card within the frame
          </p>
        </div>
        <div className="p-4 flex items-center justify-between">
          <button onClick={reset} className="text-xs text-zinc-500 hover:text-zinc-700">Cancel</button>
          <button
            onClick={captureFrame}
            className="w-14 h-14 rounded-full bg-violet-600 border-4 border-violet-200 flex items-center justify-center hover:bg-violet-700 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white/20" />
          </button>
          <div className="w-12" />
        </div>
      </div>
    );
  }

  if (mode === "scanning") {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-8 text-center">
        {preview && (
          <img src={preview} alt="Card" className="w-48 h-auto mx-auto rounded-xl mb-4 opacity-50" />
        )}
        <svg className="w-6 h-6 animate-spin text-violet-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm font-medium text-zinc-900">Reading card details...</p>
        <p className="text-xs text-zinc-400 mt-1">Only the last 4 digits are extracted</p>
      </div>
    );
  }

  if (mode === "confirm" && result) {
    const displayName = result.cardName
      ? `${result.issuer ? result.issuer + " " : ""}${result.cardName}`
      : result.issuer ?? result.network.toUpperCase();

    return (
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-semibold text-zinc-900">Card Detected</h3>
          </div>
          <p className="text-xs text-zinc-400">Verify the details below</p>
        </div>

        <div className="p-5">
          {/* Mini card preview */}
          <div
            className="w-full aspect-[3.375/2.125] rounded-xl p-4 flex flex-col justify-between mb-4"
            style={{
              background: result.dominantColor
                ? `linear-gradient(135deg, ${result.dominantColor}, ${adjustColor(result.dominantColor, -30)})`
                : "linear-gradient(135deg, #18181b, #09090b)",
            }}
          >
            <div className="flex justify-between items-start">
              <p className="text-white/60 text-[10px] font-medium uppercase tracking-widest">{result.issuer ?? ""}</p>
              <p className="text-white/80 text-[10px] font-bold uppercase">{result.network}</p>
            </div>
            <div>
              <p className="text-white font-mono text-sm tracking-[0.2em]">•••• •••• •••• {result.last4}</p>
              <div className="flex justify-between items-end mt-2">
                <p className="text-white/70 text-[10px] uppercase">{result.cardholderName ?? ""}</p>
                {result.expMonth && result.expYear && (
                  <p className="text-white/70 text-[10px] font-mono">
                    {String(result.expMonth).padStart(2, "0")}/{String(result.expYear).slice(-2)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Card</p>
              <p className="font-medium text-zinc-900">{displayName}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Number</p>
              <p className="font-mono text-zinc-900">•••• {result.last4}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Network</p>
              <p className="text-zinc-900 capitalize">{result.network}</p>
            </div>
            {result.expMonth && result.expYear && (
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Expires</p>
                <p className="text-zinc-900">{String(result.expMonth).padStart(2, "0")}/{result.expYear}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-emerald-50 border border-emerald-200/60 px-3 py-2 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <p className="text-[11px] text-emerald-700">
                Only last 4 digits stored. Full number was never transmitted or saved.
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-zinc-100 flex items-center justify-between">
          <button onClick={reset} className="text-xs text-zinc-500 hover:text-zinc-700">Cancel</button>
          <button
            onClick={saveCard}
            disabled={saving}
            className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Card"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
}
