"use client";

import { useState } from "react";
import { SidebarNav } from "./sidebar-nav";
import { LogoutButton } from "./logout-button";

export function MobileSidebar({ email }: { email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0c0c10] border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setOpen(true)} className="p-1 text-zinc-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">R</span>
            </div>
            <span className="text-sm font-semibold text-white">Receipts</span>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out sidebar */}
      <div className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#0c0c10] transform transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8 px-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center">
                <span className="text-white text-sm font-bold">R</span>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Receipts</h2>
                <p className="text-[11px] text-zinc-500 truncate max-w-[150px]">{email}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 text-zinc-500 hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div onClick={() => setOpen(false)}>
            <SidebarNav />
          </div>

          <div className="pt-4 mt-4 border-t border-white/[0.06]">
            <LogoutButton />
          </div>
        </div>
      </div>
    </>
  );
}
