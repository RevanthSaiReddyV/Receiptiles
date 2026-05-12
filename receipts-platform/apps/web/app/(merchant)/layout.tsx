'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ReactNode } from 'react';

/**
 * Merchant Dashboard Layout
 * Protected layout for retailers managing devices, webhooks, and analytics.
 */
export default function MerchantLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (!session) {
    redirect('/login?callbackUrl=/devices');
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-neutral-200 bg-white flex flex-col">
        <div className="p-6 border-b border-neutral-200">
          <h1 className="text-lg font-semibold text-neutral-900">Merchant Portal</h1>
          <p className="text-sm text-neutral-500 mt-1">{session.user?.email}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem href="/devices" icon="📟">Devices</NavItem>
          <NavItem href="/analytics" icon="📊">Analytics</NavItem>
          <NavItem href="/webhooks" icon="🔗">Webhooks</NavItem>
          <NavItem href="/settings" icon="⚙️">Settings</NavItem>
        </nav>

        <div className="p-4 border-t border-neutral-200">
          <Link
            href="/dashboard"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            ← Back to Consumer App
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, icon, children }: { href: string; icon: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
    >
      <span>{icon}</span>
      <span className="text-sm font-medium">{children}</span>
    </Link>
  );
}
