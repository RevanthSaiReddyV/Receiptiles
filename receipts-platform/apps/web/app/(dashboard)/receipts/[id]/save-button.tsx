"use client";

import { useState } from "react";
import { toPng } from "html-to-image";

export function SaveReceiptButton() {
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const el = document.getElementById("receipt-capture");
    if (!el) return;

    setSaving(true);
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: "#f8f9fb",
        pixelRatio: 3,
      });

      const link = document.createElement("a");
      link.download = `receipt-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to save receipt:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    const el = document.getElementById("receipt-capture");
    if (!el) return;

    setSaving(true);
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: "#f8f9fb",
        pixelRatio: 3,
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "receipt.png", { type: "image/png" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Receipt" });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        alert("Receipt copied to clipboard!");
      }
    } catch (err) {
      console.error("Failed to share:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleShare}
        disabled={saving}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
        Share
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        {saving ? "Saving..." : "Save as Image"}
      </button>
    </div>
  );
}
