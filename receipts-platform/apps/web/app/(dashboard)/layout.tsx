import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "./logout-button";
import { SidebarNav } from "./sidebar-nav";
import { MobileSidebar } from "./mobile-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      {/* Mobile sidebar (hamburger menu) */}
      <MobileSidebar email={session.user.email ?? ""} />

      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-64 bg-[#0c0c10] border-r border-white/[0.06] p-5 flex-col flex-shrink-0">
        <div className="mb-8 px-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">R</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Receipts</h2>
              <p className="text-[11px] text-zinc-500 truncate max-w-[150px]">{session.user.email}</p>
            </div>
          </div>
        </div>
        <SidebarNav />
        <div className="pt-4 mt-4 border-t border-white/[0.06]">
          <LogoutButton />
        </div>
      </aside>

      {/* Content area */}
      <main className="flex-1 bg-[#f8f9fb] min-h-screen overflow-auto">
        {/* Spacer for mobile top bar */}
        <div className="md:hidden h-14" />
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
