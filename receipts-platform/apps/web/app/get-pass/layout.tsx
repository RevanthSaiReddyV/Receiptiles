import { SessionProvider } from "next-auth/react";

export const metadata = {
  title: "Add to Wallet — Receiptiles",
  description: "Add your Receiptiles pass to Apple Wallet or Google Wallet for instant tap-to-receive digital receipts.",
};

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
