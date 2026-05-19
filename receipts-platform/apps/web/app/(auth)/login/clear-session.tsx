"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

export function ClearSessionOnMount() {
  useEffect(() => {
    signOut({ redirect: false });
  }, []);

  return null;
}
