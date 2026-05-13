"use client";

import dynamic from "next/dynamic";

const ReceiptStorm = dynamic(() => import("./receipt-storm"), { ssr: false });

export default function LandingPage() {
  return <ReceiptStorm />;
}
