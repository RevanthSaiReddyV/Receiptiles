"use client";

import { disconnectSource } from "./actions";

export function DisconnectButton({
  id,
  type,
}: {
  id: string;
  type: "email" | "merchant" | "customer";
}) {
  return (
    <form action={disconnectSource}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="type" value={type} />
      <button
        type="submit"
        className="text-sm text-red-600 hover:text-red-800"
      >
        Disconnect
      </button>
    </form>
  );
}
