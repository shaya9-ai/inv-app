"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, Minus, Plus, Save, Percent, BadgeDollarSign } from "lucide-react";
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
    <aside className="w-full md:w-96 xl:w-[420px] bg-[#0f0f17] border-l border-[var(--border)] fixed bottom-0 right-0 h-[70vh] md:h-[calc(100vh-80px)] p-4 md:p-6 overflow-y-auto transition-transform animate-slide-in-right shadow-glow z-40 md:sticky md:top-4 md:bottom-auto md:right-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs uppercase text-gray-500">Customer</p>
          <input
            placeholder="Name"
            className="w-full bg-[#15151f] rounded-lg px-3 py-2 text-sm border border-[var(--border)] mt-1"
            value={state.customerName}
            onChange={(e) => setCustomer(e.target.value, state.customerPhone)}
          />
          <input
            placeholder="Phone"
            className="w-full bg-[#15151f] rounded-lg px-3 py-2 text-sm border border-[var(--border)] mt-2"
            value={state.customerPhone}
            onChange={(e) => setCustomer(state.customerName, e.target.value)}
          />
        </div>
        <button
          onClick={() => clear()}
          className="text-xs text-gray-400 hover:text-white border border-[var(--border)] px-2 py-1 rounded-lg"
        >
          Clear
        </button>
      </div>

      <div className="space-y-3">
        {state.items.length === 0 && <p className="text-gray-500 text-sm">Cart empty.</p>}
        {state.items.map((item) => (
          <div
            key={item.id}
            className="bg-[#15151f] border border-[var(--border)] rounded-xl p-3 flex gap-3 items-start shine"
          >
            <div className="flex-1">
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-gray-400">{item.category ?? "—"}</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => updateQty(item.id, Math.max(item.quantity - 1, 0))}
                  className="h-8 w-8 rounded-lg border border-[var(--border)] flex items-center justify-center"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  className="h-8 w-16 text-center rounded-lg bg-[#0f0f17] border border-[var(--border)]"
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
                <span className="text-xs text-gray-400">Unit price</span>
                <input
                  type="number"
                  className="h-8 w-24 rounded-lg bg-[#0f0f17] border border-[var(--border)] px-2"
                  value={item.price}
                  onChange={(e) => updatePrice(item.id, Number(e.target.value))}
                />
              </div>
            </div>
            <div className="text-right">
              <button onClick={() => removeItem(item.id)} className="text-gray-500 hover:text-red-400">
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
          <div className="flex items-center bg-[#15151f] rounded-lg border border-[var(--border)] overflow-hidden">
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
            className="flex-1 h-10 rounded-lg bg-[#15151f] border border-[var(--border)] px-3 text-sm"
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
        <button
          onClick={() => onSave?.()}
          disabled={saving}
          className="btn btn-primary gap-2 w-full disabled:opacity-60"
        >
          <Save size={16} />
          Save Invoice
        </button>
      </div>
    </aside>
  );
}
