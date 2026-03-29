"use client";

import { Product } from "@prisma/client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { calculateTotal } from "../../lib/cartMath";
import { openGrnPrint } from "../../lib/printInvoice";
import { PlusCircle, Trash2, Printer } from "lucide-react";
import clsx from "clsx";

type Props = { products: Product[] };

type LineItem = { productId: number; name: string; unit?: string; quantity: number; price: number };

export default function CheckinGrid({ products }: Props) {
  const [items, setItems] = useState<LineItem[]>([]);
  const [supplierName, setSupplierName] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">("AMOUNT");

  const filteredProducts = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.unit.toLowerCase().includes(q)
    );
  }, [products, query]);

  const totals = useMemo(
    () =>
      calculateTotal({
        items: items as any,
        discount,
        discountType,
        customerName: "",
        customerPhone: "",
      }),
    [items, discount, discountType]
  );

  const addItem = (p: Product) => {
    const existing = items.find((i) => i.productId === p.id);
    if (existing) {
      setItems((prev) =>
        prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i))
      );
    } else {
      setItems((prev) => [...prev, { productId: p.id, name: p.name, unit: p.unit, quantity: 1, price: p.buyPrice }]);
    }
    toast.success(`Added ${p.name} to receipt`);
  };

  const updateQty = (id: number, qty: number) =>
    setItems((prev) => prev.map((i) => (i.productId === id ? { ...i, quantity: Math.max(qty, 0) } : i)));
  const updatePrice = (id: number, price: number) =>
    setItems((prev) => prev.map((i) => (i.productId === id ? { ...i, price: Math.max(price, 0) } : i)));
  const removeItem = (id: number) => setItems((prev) => prev.filter((i) => i.productId !== id));

  const saveReceipt = async (print?: boolean) => {
    if (items.length === 0) return toast.error("No items added");
    setSaving(true);
    const res = await fetch("/api/stock/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, supplierName, note, discount, discountType }),
    });
    setSaving(false);
    if (!res.ok) {
      const msg = await res.text();
      toast.error(msg || "Failed to save");
      return;
    }
    const data = await res.json();
    setReceipt(data.receipt);
    toast.success("Stock updated");
    if (print) openGrnPrint(data.receipt);
    setItems([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Products</h2>
            <p className="text-sm text-gray-400">Hover a product to add to receipt.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              className="input w-56"
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              onClick={() => setQuery("")}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-lg px-2 py-1"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="relative card p-4 group overflow-hidden hover:-translate-y-1 transition transform duration-200 shine"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-lg">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Stock</p>
                  <p className="font-bold">{p.currentStock}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-gray-300">
                <span>Buy Rs {p.buyPrice.toFixed(2)}</span>
                <span className="text-gray-500">Unit {p.unit}</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-[#11111a]/90 to-black/80 opacity-0 group-hover:opacity-100 transition flex flex-col justify-center items-center gap-3 backdrop-blur-sm">
                <button
                  onClick={() => addItem(p)}
                  className="btn btn-primary w-40 shadow-glow"
                >
                  + Add to Receipt
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="w-full bg-[var(--muted)] border-l border-[var(--border)] sticky top-4 p-4 md:p-6 shadow-glow animate-slide-in-right">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase text-gray-500">Supplier</p>
            <input
              placeholder="Supplier name"
              className="w-full bg-[var(--input-bg)] rounded-lg px-3 py-2 text-sm border border-[var(--border)] mt-1"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
            <input
              placeholder="Note"
              className="w-full bg-[var(--input-bg)] rounded-lg px-3 py-2 text-sm border border-[var(--border)] mt-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              setItems([]);
              setSupplierName("");
              setNote("");
            }}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] border border-[var(--border)] px-2 py-1 rounded-lg"
          >
            Clear
          </button>
        </div>

        <div className="space-y-3">
          {items.length === 0 && <p className="text-gray-500 text-sm">No items yet.</p>}
          {items.map((item) => (
            <div
              key={item.productId}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 flex gap-3 items-start shine"
            >
              <div className="flex-1">
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-gray-400">{item.unit ?? "—"}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">Qty</span>
                  <input
                    type="number"
                    className="h-8 w-16 text-center rounded-lg bg-[var(--input-bg)] border border-[var(--border)]"
                    value={item.quantity}
                    onChange={(e) => updateQty(item.productId, Number(e.target.value))}
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">Unit price</span>
                  <input
                    type="number"
                    className="h-8 w-24 rounded-lg bg-[var(--input-bg)] border border-[var(--border)] px-2"
                    value={item.price}
                    onChange={(e) => updatePrice(item.productId, Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="text-right">
                <button onClick={() => removeItem(item.productId)} className="text-gray-500 hover:text-red-400">
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
            <span>Rs {totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[var(--input-bg)] rounded-lg border border-[var(--border)] overflow-hidden text-xs">
              <button
                onClick={() => setDiscountType("AMOUNT")}
                className={clsx("px-3 py-2", discountType === "AMOUNT" && "bg-[var(--accent)] text-black")}
              >
                Amount
              </button>
              <button
                onClick={() => setDiscountType("PERCENT")}
                className={clsx("px-3 py-2", discountType === "PERCENT" && "bg-[var(--accent)] text-black")}
              >
                %
              </button>
            </div>
            <input
              type="number"
              className="input flex-1 h-10"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              placeholder="Discount"
            />
          </div>
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span>Rs {totals.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => saveReceipt(false)}
            disabled={saving}
            className="btn btn-primary gap-2 disabled:opacity-60"
          >
            Save Receipt
          </button>
          <button
            onClick={() => saveReceipt(true)}
            disabled={saving}
            className="btn gap-2 border border-[var(--border)] hover:border-[var(--accent)]"
          >
            <Printer size={16} />
            Save & Print
          </button>
        </div>

        {receipt && (
          <div className="mt-4 p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]">
            <div className="flex items-center justify-between text-sm">
              <p className="font-semibold">#{receipt.receiptNumber}</p>
              <button className="text-xs text-[var(--accent)]" onClick={() => openGrnPrint(receipt)}>
                Print again
              </button>
            </div>
            <p className="text-xs text-gray-400">{receipt.date}</p>
            <p className="text-xs text-gray-400">Items: {receipt.items?.length ?? 0}</p>
            <p className="text-xs text-gray-400">Discount: Rs {receipt.discount} {receipt.discountType}</p>
            <p className="font-semibold mt-1">Rs {receipt.total}</p>
          </div>
        )}
      </aside>
    </div>
  );
}
