"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type LicenseStatus = { valid: boolean; daysLeft?: number; expiresAt?: number; error?: string };

export default function LicensePanel() {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isElectron = ua.includes("Electron");
    if (!isElectron) return;
    refresh();
  }, []);

  const refresh = () => {
    fetch("/api/license-status")
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => setStatus(null));
  };

  const replace = async () => {
    if (!token.trim()) return toast.error("Paste a license token first");
    setBusy(true);
    const res = await fetch("/api/license-replace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() }),
    });
    setBusy(false);
    const data = await res.json();
    if (res.ok && data.ok) {
      toast.success("License updated");
      setToken("");
      refresh();
    } else {
      toast.error(data.error || "License update failed");
    }
  };

  const renderStatus = () => {
    if (!status)
      return (
        <p className="text-sm text-gray-400">
          License: activated. (Web preview may not show days left.)
        </p>
      );
    return (
      <div className="text-sm text-gray-200 space-y-1">
        <p>License: {status.daysLeft !== undefined ? `${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"} left` : "activated"}</p>
        {status.expiresAt && <p>Expires: {new Date(status.expiresAt).toLocaleString()}</p>}
      </div>
    );
  };

  return (
    <div className="card p-6 space-y-4 animate-fade-in">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-gray-400">License</p>
        <p className="text-lg font-semibold text-[var(--foreground)]">Activation Status</p>
      </div>
      {renderStatus()}
      <div className="space-y-2">
        <p className="text-sm text-gray-400">Paste a new license token (.lic contents) to replace the current one.</p>
        <textarea
          className="input min-h-[90px] font-mono text-xs"
          placeholder="Paste license token here"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button className="btn btn-primary w-fit gap-2" onClick={replace} disabled={busy}>
          {busy ? "Updating..." : "Update License"}
        </button>
      </div>
      <p className="text-xs text-gray-500">Desktop app only. Web preview will show status unavailable.</p>
    </div>
  );
}
