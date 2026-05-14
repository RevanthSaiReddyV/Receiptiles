"use client";

import { useState, useRef, useCallback } from "react";
import { addCardWithPreset } from "@/lib/actions/cards";
import { CARD_DATABASE } from "@/lib/rewards/card-database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanApiResponse {
  last4: string;
  network: string;
  cardProduct: string | null;
  cardName: string;
  issuer: string | null;
  preset: string;
  expMonth: number | null;
  expYear: number | null;
  cardholderName: string | null;
  confidence: "high" | "medium" | "low";
}

type Mode = "idle" | "camera" | "scanning" | "review" | "confirm";
type ScanSide = "front" | "back";

// ---------------------------------------------------------------------------
// Card picker list (for manual fallback)
// ---------------------------------------------------------------------------

const POPULAR_CARDS_FOR_PICKER = CARD_DATABASE.slice(0, 20).map((c) => ({
  id: c.id,
  name: c.name,
  issuer: c.issuer,
  network: c.network,
}));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CardScanner({ onDone }: { onDone?: () => void }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [scanSide, setScanSide] = useState<ScanSide>("front");
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [apiResult, setApiResult] = useState<ScanApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editable fields for the confirm step
  const [editLast4, setEditLast4] = useState("");
  const [editNetwork, setEditNetwork] = useState("visa");
  const [editCardName, setEditCardName] = useState("");
  const [editPreset, setEditPreset] = useState("custom");
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [cardPickerSearch, setCardPickerSearch] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frontFileRef = useRef<HTMLInputElement>(null);
  const backFileRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // -----------------------------------------------------------------------
  // Camera
  // -----------------------------------------------------------------------

  async function startCamera(side: ScanSide) {
    setError(null);
    setScanSide(side);
    setMode("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("Camera access denied. Use the upload buttons instead.");
      setMode("idle");
    }
  }

  function captureFrame() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    stopCamera();

    if (scanSide === "front") {
      setFrontImage(dataUrl);
      // Ask if they want to also scan the back
      setMode("review");
    } else {
      setBackImage(dataUrl);
      // We have the back now, send to AI
      callScanApi(frontImage, dataUrl);
    }
  }

  // -----------------------------------------------------------------------
  // File upload
  // -----------------------------------------------------------------------

  function handleFileUpload(
    side: ScanSide,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (side === "front") {
        setFrontImage(dataUrl);
        // Show review to allow adding back
        setMode("review");
      } else {
        setBackImage(dataUrl);
        // Send to AI with whatever we have
        callScanApi(frontImage, dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // -----------------------------------------------------------------------
  // AI-powered scan via API
  // -----------------------------------------------------------------------

  async function callScanApi(front: string | null, back: string | null) {
    if (!front && !back) return;

    setMode("scanning");
    setError(null);

    try {
      const res = await fetch("/api/cards/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontImage: front ?? undefined,
          backImage: back ?? undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Scan failed" }));
        throw new Error(err.error ?? `Server error ${res.status}`);
      }

      const data: ScanApiResponse = await res.json();
      setApiResult(data);

      // Pre-fill editable fields
      setEditLast4(data.last4);
      setEditNetwork(data.network);
      setEditCardName(data.cardName);
      setEditPreset(data.preset);

      setMode("confirm");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Card scan failed. You can pick your card manually."
      );
      // Go to confirm so user can enter manually
      setEditCardName("");
      setEditLast4("");
      setEditNetwork("visa");
      setEditPreset("custom");
      setMode("confirm");
    }
  }

  // -----------------------------------------------------------------------
  // Save card
  // -----------------------------------------------------------------------

  async function saveCard() {
    if (!editLast4 || editLast4.length !== 4) {
      setError("Please enter the last 4 digits of your card.");
      return;
    }
    if (!editCardName.trim()) {
      setError("Please enter or select a card name.");
      return;
    }

    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", editCardName.trim());
    formData.append("last4", editLast4);
    formData.append("network", editNetwork);
    formData.append("preset", editPreset);

    try {
      await addCardWithPreset(formData);
      reset();
      onDone?.();
    } catch {
      setError("Failed to save card. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------

  function reset() {
    stopCamera();
    setMode("idle");
    setScanSide("front");
    setFrontImage(null);
    setBackImage(null);
    setApiResult(null);
    setError(null);
    setSaving(false);
    setEditLast4("");
    setEditNetwork("visa");
    setEditCardName("");
    setEditPreset("custom");
    setShowCardPicker(false);
    setCardPickerSearch("");
  }

  // -----------------------------------------------------------------------
  // Filtered card list for the picker
  // -----------------------------------------------------------------------

  const filteredPickerCards = cardPickerSearch.trim()
    ? POPULAR_CARDS_FOR_PICKER.filter(
        (c) =>
          c.name.toLowerCase().includes(cardPickerSearch.toLowerCase()) ||
          c.issuer.toLowerCase().includes(cardPickerSearch.toLowerCase())
      )
    : POPULAR_CARDS_FOR_PICKER;

  // =======================================================================
  // RENDER
  // =======================================================================

  // -- IDLE ---------------------------------------------------------------

  if (mode === "idle") {
    return (
      <div>
        {error && (
          <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => startCamera("front")}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors shadow-sm"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                />
              </svg>
              Scan Card
            </button>
            <button
              onClick={() => frontFileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              Upload Front
            </button>
            <button
              onClick={() => backFileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
                />
              </svg>
              Upload Back
            </button>
          </div>
          <p className="text-[10px] text-zinc-400">
            Tip: Upload both front and back for best results. Many modern cards
            print the number only on the back.
          </p>
        </div>

        <input
          ref={frontFileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileUpload("front", e)}
        />
        <input
          ref={backFileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileUpload("back", e)}
        />
      </div>
    );
  }

  // -- CAMERA -------------------------------------------------------------

  if (mode === "camera") {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
        <div className="relative bg-black aspect-[16/10]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {/* Card alignment frame */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[80%] aspect-[3.375/2.125] border-2 border-white/50 rounded-2xl relative">
              <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-white/70 rounded-tl-lg" />
              <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-white/70 rounded-tr-lg" />
              <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-white/70 rounded-bl-lg" />
              <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-white/70 rounded-br-lg" />
            </div>
          </div>
          {/* Side label */}
          <div className="absolute top-3 left-0 right-0 flex justify-center">
            <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full">
              {scanSide === "front" ? "Front of card" : "Back of card"}
            </span>
          </div>
          <p className="absolute bottom-3 left-0 right-0 text-center text-white/70 text-xs">
            Align your card within the frame
          </p>
        </div>
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={() => {
              stopCamera();
              setMode(frontImage || backImage ? "review" : "idle");
            }}
            className="text-xs text-zinc-500 hover:text-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={captureFrame}
            className="w-14 h-14 rounded-full bg-violet-600 border-4 border-violet-200 flex items-center justify-center hover:bg-violet-700 transition-colors"
          >
            <div className="w-10 h-10 rounded-full border-2 border-white/40" />
          </button>
          <div className="w-12" />
        </div>
      </div>
    );
  }

  // -- SCANNING (AI processing) -------------------------------------------

  if (mode === "scanning") {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-8 text-center">
        {/* Thumbnails */}
        <div className="flex justify-center gap-3 mb-4">
          {frontImage && (
            <div className="relative">
              <img
                src={frontImage}
                alt="Front"
                className="w-28 h-auto rounded-xl opacity-50"
              />
              <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded">
                Front
              </span>
            </div>
          )}
          {backImage && (
            <div className="relative">
              <img
                src={backImage}
                alt="Back"
                className="w-28 h-auto rounded-xl opacity-50"
              />
              <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded">
                Back
              </span>
            </div>
          )}
        </div>

        {/* Loading animation */}
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:0ms]" />
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:150ms]" />
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:300ms]" />
        </div>

        <p className="text-sm font-medium text-zinc-900">
          AI is reading your card...
        </p>
        <p className="text-xs text-zinc-400 mt-1">
          Identifying card product, number, and network
        </p>
      </div>
    );
  }

  // -- REVIEW (captured one side, offer to add the other) -----------------

  if (mode === "review") {
    const hasFront = !!frontImage;
    const hasBack = !!backImage;

    return (
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-900">
            {hasFront && !hasBack
              ? "Front captured"
              : !hasFront && hasBack
              ? "Back captured"
              : "Images captured"}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {hasFront && !hasBack
              ? "Add the back of your card for better accuracy. Many cards print the number on the back."
              : !hasFront && hasBack
              ? "Optionally add the front to help identify the card product."
              : "Both sides captured. Ready to scan."}
          </p>
        </div>

        {/* Thumbnails */}
        <div className="p-5 flex gap-3">
          {frontImage && (
            <div className="relative">
              <img
                src={frontImage}
                alt="Front"
                className="w-32 h-auto rounded-xl border border-zinc-200"
              />
              <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded">
                Front
              </span>
              <button
                onClick={() => {
                  setFrontImage(null);
                  if (!backImage) setMode("idle");
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
              >
                x
              </button>
            </div>
          )}
          {backImage && (
            <div className="relative">
              <img
                src={backImage}
                alt="Back"
                className="w-32 h-auto rounded-xl border border-zinc-200"
              />
              <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded">
                Back
              </span>
              <button
                onClick={() => {
                  setBackImage(null);
                  if (!frontImage) setMode("idle");
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
              >
                x
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-zinc-100 flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={reset}
            className="text-xs text-zinc-500 hover:text-zinc-700"
          >
            Start over
          </button>

          <div className="flex gap-2 flex-wrap">
            {!hasBack && (
              <>
                <button
                  onClick={() => startCamera("back")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-100 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                    />
                  </svg>
                  Scan back
                </button>
                <button
                  onClick={() => backFileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Upload back
                </button>
              </>
            )}
            {!hasFront && (
              <>
                <button
                  onClick={() => startCamera("front")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-100 transition-colors"
                >
                  Scan front
                </button>
                <button
                  onClick={() => frontFileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Upload front
                </button>
              </>
            )}

            {/* Process with what we have */}
            <button
              onClick={() => callScanApi(frontImage, backImage)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                />
              </svg>
              Scan with AI
            </button>
          </div>
        </div>

        <input
          ref={frontFileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileUpload("front", e)}
        />
        <input
          ref={backFileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileUpload("back", e)}
        />
      </div>
    );
  }

  // -- CONFIRM (editable AI results) --------------------------------------

  if (mode === "confirm") {
    const confidenceLabel =
      apiResult?.confidence === "high"
        ? "High confidence"
        : apiResult?.confidence === "medium"
        ? "Medium confidence"
        : apiResult
        ? "Low confidence"
        : null;
    const confidenceColor =
      apiResult?.confidence === "high"
        ? "text-emerald-600 bg-emerald-50"
        : apiResult?.confidence === "medium"
        ? "text-amber-600 bg-amber-50"
        : "text-red-600 bg-red-50";

    return (
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-sm font-semibold text-zinc-900">
                Verify Card Details
              </h3>
            </div>
            {confidenceLabel && (
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${confidenceColor}`}
              >
                {confidenceLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            Review and correct any details before saving.
          </p>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Editable form */}
        <div className="p-5 space-y-4">
          {/* Card name / product */}
          <div>
            <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
              Card Name
            </label>
            {showCardPicker ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={cardPickerSearch}
                  onChange={(e) => setCardPickerSearch(e.target.value)}
                  placeholder="Search cards..."
                  autoFocus
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100"
                />
                <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200 divide-y divide-zinc-50">
                  {filteredPickerCards.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setEditCardName(c.name);
                        setEditNetwork(c.network);
                        setEditPreset(c.id);
                        setShowCardPicker(false);
                        setCardPickerSearch("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-violet-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-zinc-900">
                        {c.name}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {c.issuer} &middot; {c.network}
                      </p>
                    </button>
                  ))}
                  {filteredPickerCards.length === 0 && (
                    <div className="px-3 py-4 text-center">
                      <p className="text-xs text-zinc-400">No matches</p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCardPicker(false);
                    setCardPickerSearch("");
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editCardName}
                  onChange={(e) => {
                    setEditCardName(e.target.value);
                    setEditPreset("custom");
                  }}
                  className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100"
                  placeholder="e.g. Chase Sapphire Preferred"
                />
                <button
                  type="button"
                  onClick={() => setShowCardPicker(true)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-violet-600 hover:bg-violet-50 transition-colors whitespace-nowrap"
                >
                  Pick card
                </button>
              </div>
            )}
          </div>

          {/* Last 4 + Network */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Last 4 Digits
              </label>
              <input
                type="text"
                value={editLast4}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setEditLast4(v);
                }}
                maxLength={4}
                inputMode="numeric"
                pattern="\d{4}"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono text-zinc-900 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100"
                placeholder="1234"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Network
              </label>
              <select
                value={editNetwork}
                onChange={(e) => setEditNetwork(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100"
              >
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
                <option value="amex">Amex</option>
                <option value="discover">Discover</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Expiration & Name (read-only, informational) */}
          {(apiResult?.expMonth || apiResult?.cardholderName) && (
            <div className="grid grid-cols-2 gap-3">
              {apiResult.expMonth && apiResult.expYear && (
                <div>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                    Expires
                  </p>
                  <p className="text-sm text-zinc-700">
                    {String(apiResult.expMonth).padStart(2, "0")}/
                    {apiResult.expYear}
                  </p>
                </div>
              )}
              {apiResult.cardholderName && (
                <div>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                    Cardholder
                  </p>
                  <p className="text-sm text-zinc-700">
                    {apiResult.cardholderName}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Matched preset indicator */}
          {editPreset !== "custom" && (
            <div className="rounded-lg bg-violet-50 border border-violet-200/60 px-3 py-2">
              <div className="flex items-center gap-2">
                <svg
                  className="w-3.5 h-3.5 text-violet-600 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                  />
                </svg>
                <p className="text-[11px] text-violet-700">
                  Reward rules will be auto-filled from our database.
                </p>
              </div>
            </div>
          )}

          {/* Privacy note */}
          <div className="rounded-lg bg-emerald-50 border border-emerald-200/60 px-3 py-2">
            <div className="flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              <p className="text-[11px] text-emerald-700">
                Images are sent securely to our server for AI processing, then
                immediately discarded. We never store card images.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-zinc-100 flex items-center justify-between">
          <button
            onClick={reset}
            className="text-xs text-zinc-500 hover:text-zinc-700"
          >
            Start over
          </button>
          <div className="flex gap-2">
            {(!frontImage || !backImage) && (
              <button
                onClick={() => {
                  const missing: ScanSide = !backImage ? "back" : "front";
                  startCamera(missing);
                }}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                + Add {!backImage ? "back" : "front"}
              </button>
            )}
            <button
              onClick={saveCard}
              disabled={saving || editLast4.length !== 4 || !editCardName.trim()}
              className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Card"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
