import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "./logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="w-64 border-r border-gray-200 bg-white p-6 flex flex-col">
        <div className="mb-8">
          <h2 className="text-lg font-bold">Receipts</h2>
          <p className="text-sm text-gray-500 truncate">{session.user.email}</p>
        </div>
        <nav className="space-y-1 flex-1">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/receipts">Receipts</NavLink>
          <NavLink href="/upload">Upload</NavLink>
          <NavLink href="/email">Email</NavLink>
          <NavLink href="/cards">Cards</NavLink>
          <NavLink href="/insights">Insights</NavLink>
          <NavLink href="/settings">Settings</NavLink>
        </nav>
        <div className="pt-4 border-t border-gray-200">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
    >
      {children}
    </Link>
  );
}
