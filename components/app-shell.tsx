"use client";

import Sidebar from "./sidebar";
import { Bell } from "lucide-react";

export default function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="flex w-full">
      <Sidebar />
      <main className="flex-1 min-h-screen bg-transparent">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0b0b12]/70 border-b border-[var(--border)] px-4 md:px-8 py-4 flex items-center justify-between shadow-glow">
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-[0.2em]">Inventory Suite</p>
            <h1 className="text-xl font-bold text-white">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-full p-2 hover:bg-[var(--muted)] border border-[var(--border)] shine">
              <Bell size={18} />
            </button>
          </div>
        </header>
        <div className="p-4 md:p-8 space-y-4 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
