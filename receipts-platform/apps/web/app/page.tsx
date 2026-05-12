import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Universal Receipts Platform
        </h1>
        <p className="mt-4 text-xl text-gray-600">
          All your receipts in one place. Upload, import from email, search, and
          get spending insights with card reward optimization.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/signup"
            className="rounded-lg bg-black px-6 py-3 text-white font-medium hover:bg-gray-800"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-gray-300 px-6 py-3 font-medium hover:bg-gray-100"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
