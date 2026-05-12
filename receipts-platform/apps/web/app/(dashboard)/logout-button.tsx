"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
    >
      Sign Out
    </button>
  );
}
