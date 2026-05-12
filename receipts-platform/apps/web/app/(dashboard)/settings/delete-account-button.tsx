"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "./actions";
import { signOut } from "next-auth/react";

export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        Delete Account
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-red-700">Are you sure? This cannot be undone.</span>
      <button
        onClick={() =>
          startTransition(async () => {
            await deleteAccount();
            await signOut({ callbackUrl: "/login" });
          })
        }
        disabled={isPending}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {isPending ? "Deleting..." : "Yes, delete my account"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="rounded-md border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        Cancel
      </button>
    </div>
  );
}
