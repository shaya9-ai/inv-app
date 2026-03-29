"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Home, Package2, Receipt, Settings, Waypoints, BarChart3 } from "lucide-react";

import clsx from "clsx";
import { useEffect, useState } from "react";

const nav = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/checkin", label: "Check-in", icon: Waypoints },
  { href: "/movements", label: "Movements", icon: Package2 },
  { href: "/invoice", label: "Invoices", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [license, setLicense] = useState<{ daysLeft?: number; valid?: boolean; error?: string } | null>(null);

  useEffect(() => {
    // Detect Electron renderer by userAgent (nodeIntegration is off, so process may be undefined)
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isElectron = ua.includes("Electron");
    if (!isElectron) return;
    fetch("/api/license-status")
      .then((r) => r.json())
      .then((data) => setLicense(data))
      .catch(() => setLicense(null));
  }, []);

  return (
    <aside className="w-64 min-h-screen sticky top-0 px-4 py-6 border-r border-[var(--border)] bg-[var(--background)]/95 hidden md:flex flex-col gap-6 backdrop-blur-xl shadow-glow">
      <div className="flex items-center gap-3 font-bold text-lg tracking-tight animate-scale-in">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#f59e0b] text-black flex items-center justify-center font-black shadow-glow">
          S
        </div>
        <div>
          <p>S.PRINT SOFTWARE</p>
          <p className="text-xs text-gray-400">by VNE Digital</p>
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
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-1 text-xs">
        <div className="px-2 py-1 rounded-md border text-[11px] border-[var(--border)] text-[var(--text-secondary)]">
          {license && license.daysLeft !== undefined
            ? `License: ${license.daysLeft} day${license.daysLeft === 1 ? "" : "s"} left`
            : "License: activated"}
        </div>
      </div>
    </aside>
  );
}
