"use client";

import { useState } from "react";
import { ShopSettings } from "../../lib/settings";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SettingsForm({ defaults }: { defaults: ShopSettings }) {
  const [form, setForm] = useState(defaults);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) toast.success("Saved");
    else toast.error("Failed to save");
  };

  return (
    <div className="card p-6 max-w-xl space-y-3">
      <div className="grid grid-cols-1 gap-3 text-sm">
        <label className="flex flex-col gap-1">
          Shop Name
          <input
            className="input"
            value={form.shopName}
            onChange={(e) => setForm({ ...form, shopName: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          Address
          <input
            className="input"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          Phone
          <input
            className="input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
      </div>
      <button onClick={save} className="btn btn-primary gap-2" disabled={loading}>
        {loading && <Loader2 className="animate-spin" size={16} />}
        Save Settings
      </button>
      <p className="text-xs text-gray-500">Values are persisted to settings.json and used on print layouts.</p>
    </div>
  );
}
