"use client";

import { useTransition } from "react";
import { syncEmail } from "./actions";

export function SyncButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => syncEmail())}
      disabled={isPending}
      className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? "Syncing..." : "Sync Now"}
    </button>
  );
}
