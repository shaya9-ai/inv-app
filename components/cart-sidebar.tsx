"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, Minus, Plus, Save, Percent, BadgeDollarSign, Printer } from "lucide-react";
import { useCart } from "./cart-provider";
import { calculateTotal } from "../lib/cartMath";
import clsx from "clsx";

export default function CartSidebar({
  onSave,
  saving,
}: {
  onSave?: (print?: boolean) => void;
  saving?: boolean;
}) {
  const { state, updateQty, updatePrice, removeItem, setDiscount, setCustomer, clear } = useCart();
  const [discountType, setDiscountType] = useState(state.discountType);

  const numbers = useMemo(() => calculateTotal(state), [state]);

  useEffect(() => setDiscountType(state.discountType), [state.discountType]);

  return (
    <aside className="w-full md:w-96 xl:w-[420px] bg-[var(--muted)] border-l border-[var(--border)] fixed bottom-0 right-0 h-[70vh] md:h-[calc(100vh-80px)] p-4 md:p-6 overflow-y-auto transition-transform animate-slide-in-right shadow-glow z-40 md:sticky md:top-4 md:bottom-auto md:right-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs uppercase text-[var(--text-tertiary)]">Customer</p>
          <input
            placeholder="Name"
            className="w-full bg-[var(--input-bg)] rounded-lg px-3 py-2 text-sm border border-[var(--border)] mt-1"
            value={state.customerName}
            onChange={(e) => setCustomer(e.target.value, state.customerPhone)}
          />
          <input
            placeholder="Phone"
            className="w-full bg-[var(--input-bg)] rounded-lg px-3 py-2 text-sm border border-[var(--border)] mt-2"
            value={state.customerPhone}
            onChange={(e) => setCustomer(state.customerName, e.target.value)}
          />
        </div>
        <button
          onClick={() => clear()}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] border border-[var(--border)] px-2 py-1 rounded-lg"
        >
          Clear
        </button>
      </div>

      <div className="space-y-3">
        {state.items.length === 0 && <p className="text-[var(--text-tertiary)] text-sm">Cart empty.</p>}
        {state.items.map((item) => (
          <div
            key={item.id}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 flex gap-3 items-start shine"
          >
            <div className="flex-1">
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{item.category ?? "—"}</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => updateQty(item.id, Math.max(item.quantity - 1, 0))}
                  className="h-8 w-8 rounded-lg border border-[var(--border)] flex items-center justify-center"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  className="h-8 w-16 text-center rounded-lg bg-[var(--input-bg)] border border-[var(--border)]"
                  value={item.quantity}
                  onChange={(e) => updateQty(item.id, Number(e.target.value))}
                />
                <button
                  onClick={() => updateQty(item.id, item.quantity + 1)}
                  className="h-8 w-8 rounded-lg border border-[var(--border)] flex items-center justify-center"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-[var(--text-secondary)]">Unit price</span>
                <input
                  type="number"
                  className="h-8 w-24 rounded-lg bg-[var(--input-bg)] border border-[var(--border)] px-2"
                  value={item.price}
                  onChange={(e) => updatePrice(item.id, Number(e.target.value))}
                />
              </div>
            </div>
            <div className="text-right">
              <button onClick={() => removeItem(item.id)} className="text-[var(--text-tertiary)] hover:text-red-400">
                <Trash2 size={16} />
              </button>
              <p className="font-semibold mt-6">Rs {(item.price * item.quantity).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-[var(--border)] pt-3 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span>Subtotal</span>
          <span>Rs {numbers.subtotal.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[var(--input-bg)] rounded-lg border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => {
                setDiscountType("AMOUNT");
                setDiscount(state.discount, "AMOUNT");
              }}
              className={clsx(
                "px-3 py-2 flex items-center gap-1 text-xs",
                discountType === "AMOUNT" && "bg-[var(--accent)] text-black"
              )}
            >
              <BadgeDollarSign size={14} /> Amount
            </button>
            <button
              onClick={() => {
                setDiscountType("PERCENT");
                setDiscount(state.discount, "PERCENT");
              }}
              className={clsx(
                "px-3 py-2 flex items-center gap-1 text-xs",
                discountType === "PERCENT" && "bg-[var(--accent)] text-black"
              )}
            >
              <Percent size={14} /> %
            </button>
          </div>
          <input
            type="number"
            className="flex-1 h-10 rounded-lg bg-[var(--input-bg)] border border-[var(--border)] px-3 text-sm"
            value={state.discount}
            onChange={(e) => setDiscount(Number(e.target.value), discountType)}
            placeholder="Discount"
          />
        </div>

        <div className="flex items-center justify-between text-lg font-bold">
          <span>Total</span>
          <span>Rs {numbers.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex gap-2">
          <button
            onClick={() => onSave?.()}
            disabled={saving}
            className="btn btn-primary gap-2 flex-1 disabled:opacity-60"
          >
            <Save size={16} />
            Save
          </button>
          <button
            onClick={() => onSave?.(true)}
            disabled={saving}
            className="btn btn-primary gap-2 flex-1 disabled:opacity-60"
          >
            <Printer size={16} />
            Save & Print
          </button>
        </div>
      </div>
    </aside>
  );
}
