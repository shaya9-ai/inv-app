"use client";

import { Product } from "@prisma/client";
import { useCart } from "../../../components/cart-provider";
import CartSidebar from "../../../components/cart-sidebar";
import { useState } from "react";
import { toast } from "sonner";
import { calculateTotal } from "../../../lib/cartMath";
import { openInvoicePrint } from "../../../lib/printInvoice";

export default function NewInvoice({ products }: { products: Product[] }) {
  const { addItem, state, clear } = useCart();
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState(products[0]?.id ?? 0);

  const add = () => {
    const p = products.find((p) => p.id === Number(productId));
    if (!p) return;
    addItem({ id: p.id, name: p.name, unit: p.unit, category: p.category, price: p.sellPrice, quantity: 1 });
  };

  const saveInvoice = async (print?: boolean) => {
    if (state.items.length === 0) {
      toast.error("Cart empty");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: state.customerName || "Walk-in",
        customerPhone: state.customerPhone,
        items: state.items,
        discount: state.discount,
        discountType: state.discountType,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Could not save invoice");
      return;
    }
    const invoice = await res.json();
    toast.success("Invoice saved");
    if (print) {
      openInvoicePrint(invoice);
    }
    clear();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-6">
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <select className="input flex-1" value={productId} onChange={(e) => setProductId(Number(e.target.value))}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Rs {p.sellPrice})
              </option>
            ))}
          </select>
          <button onClick={add} className="btn btn-primary">
            Add
          </button>
        </div>
        <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
          {state.items.length === 0 && (
            <p className="text-sm text-gray-500 p-3">Use dropdown to add items.</p>
          )}
          {state.items.map((item) => (
            <div key={item.id} className="p-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-gray-400">
                  Qty {item.quantity} · Rs {item.price}
                </p>
              </div>
              <p className="font-semibold">Rs {(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
      <CartSidebar onSave={saveInvoice} saving={saving} />
    </div>
  );
}

