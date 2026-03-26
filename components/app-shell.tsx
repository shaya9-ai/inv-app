"use client";

import Sidebar from "./sidebar";
import { Bell, ShoppingCart } from "lucide-react";
import { useCart } from "./cart-provider";
import Link from "next/link";

export default function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const { state } = useCart();
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
            <Link
              href="/invoice/new"
              className="relative rounded-full p-2 hover:bg-[var(--muted)] border border-[var(--border)] shine"
              aria-label="Cart"
            >
              <ShoppingCart size={18} />
              {state.items.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 text-xs rounded-full bg-[var(--accent)] text-black flex items-center justify-center">
                  {state.items.length}
                </span>
              )}
            </Link>
          </div>
        </header>
        <div className="p-4 md:p-8 space-y-4 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
