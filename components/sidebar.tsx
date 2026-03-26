"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Home, Package2, Receipt, Settings, ShoppingCart, Waypoints } from "lucide-react";
import { useCart } from "./cart-provider";
import clsx from "clsx";

const nav = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/checkin", label: "Check-in", icon: Waypoints },
  { href: "/movements", label: "Movements", icon: Package2 },
  { href: "/invoice", label: "Invoices", icon: Receipt },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  // New Invoice removed (can be created from Inventory cart)
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { state } = useCart();

  return (
    <aside className="w-64 min-h-screen sticky top-0 px-4 py-6 border-r border-[var(--border)] bg-[#0d0d15]/90 hidden md:flex flex-col gap-6 backdrop-blur-xl shadow-glow">
      <div className="flex items-center gap-3 font-bold text-lg tracking-tight animate-scale-in">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#f59e0b] text-black flex items-center justify-center font-black shadow-glow">
          IM
        </div>
        <div>
          <p>Inventory</p>
          <p className="text-xs text-gray-400">Offline Desktop</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--muted)]/70 transition shine",
                active && "bg-[var(--muted)] text-[var(--accent)] border border-[var(--border)] shadow-glow"
              )}
            >
              <Icon size={18} />
              <span className="text-sm">{item.label}</span>
              {item.href.startsWith("/invoice") && state.items.length > 0 && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[var(--accent)] text-black">
                  {state.items.length}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto text-xs text-gray-500 flex items-center gap-2">
        <ShoppingCart size={14} />
        <span>{state.items.length} items in cart</span>
      </div>
    </aside>
  );
}
