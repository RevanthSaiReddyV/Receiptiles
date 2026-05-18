"use client";

import dynamic from "next/dynamic";

const LandingPageContent = dynamic(() => import("./landing-page"), { ssr: false });

export default function LandingPage() {
  return <LandingPageContent />;
}
