"use client";

import { useState } from "react";
import { Product } from "@prisma/client";
import { useCart } from "../../components/cart-provider";
import CartSidebar from "../../components/cart-sidebar";
import { PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { calculateTotal } from "../../lib/cartMath";import { openInvoicePrint } from "../../lib/printInvoice";
type Props = {
  products: Product[];
};

export default function InventoryGrid({ products: initial }: Props) {
  const { addItem, state, clear } = useCart();
  const [products, setProducts] = useState(initial);
  const [query, setQuery] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "pcs",
    buyPrice: 0,
    sellPrice: 0,
    currentStock: 0,
  });

  const resetForm = () => {
    setForm({ name: "", category: "", unit: "pcs", buyPrice: 0, sellPrice: 0, currentStock: 0 });
    setEditing(null);
  };

  const submitForm = async () => {
    if (!form.name.trim() || !form.category.trim() || !form.unit.trim()) {
      toast.error("Name, category, and unit are required");
      return;
    }
    if (form.sellPrice < 0 || form.buyPrice < 0) {
      toast.error("Prices cannot be negative");
      return;
    }
    setLoading(true);
    const method = editing ? "PUT" : "POST";
    const body = editing ? { ...form, id: editing.id } : form;
    const res = await fetch("/api/products", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const msg = await res.text();
      toast.error(msg || "Failed to save product");
      return;
    }
    const payload = await res.json();
    if (editing) {
      setProducts((prev) => prev.map((p) => (p.id === editing.id ? payload : p)));
      toast.success("Product updated");
    } else {
      setProducts((prev) => [payload, ...prev]);
      toast.success("Product added");
    }
    resetForm();
    setOpenForm(false);
  };

  const removeProduct = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    const res = await fetch("/api/products?id=" + id, { method: "DELETE" });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Product deleted");
    } else {
      const msg = await res.text();
      toast.error(msg || "Failed to delete product");
    }
  };

  const saveInvoice = async (print?: boolean) => {
    if (state.items.length === 0) {
      toast.error("Cart empty");
      return;
    }
    setSavingInvoice(true);
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
    setSavingInvoice(false);
    if (!res.ok) {
      const msg = await res.text();
      toast.error(msg || "Could not save invoice");
      return;
    }
    const invoice = await res.json();
    toast.success("Invoice saved & stock updated");
    if (print) openInvoicePrint(invoice);
    clear();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Products</h2>
            <span className="chip">{products.length} items</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              className={inputClass + " w-52"}
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
          <button
            onClick={() => setOpenForm(true)}
            className="btn btn-primary gap-2"
          >
            <PlusCircle size={16} />
            Add Product
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {products
            .filter((p) => {
              const q = query.toLowerCase().trim();
              if (!q) return true;
              return (
                p.name.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                p.unit.toLowerCase().includes(q)
              );
            })
            .map((p) => (
            <div
              key={p.id}
              className="relative card p-4 group overflow-hidden hover:-translate-y-1 transition transform duration-200 shine animate-fade-in"
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
                <span>Sell Rs {p.sellPrice.toFixed(2)}</span>
                <span className="text-gray-500">Buy Rs {p.buyPrice.toFixed(2)}</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/30 to-black/30 opacity-0 group-hover:opacity-100 transition flex flex-col justify-center items-center gap-3 backdrop-blur-sm">
                <button
                  onClick={() =>
                    addItem({
                      id: p.id,
                      name: p.name,
                      category: p.category,
                      unit: p.unit,
                      price: p.sellPrice,
                      quantity: 1,
                    })
                  }
                  className="btn btn-primary w-40 shadow-glow"
                >
                  + Add to Invoice
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(p);
                      setForm({
                        name: p.name,
                        category: p.category,
                        unit: p.unit,
                        buyPrice: p.buyPrice,
                        sellPrice: p.sellPrice,
                        currentStock: p.currentStock,
                      });
                      setOpenForm(true);
                    }}
                    className="btn px-3 py-2 text-sm border border-[var(--border)]"
                  >
                    <Edit size={14} /> Edit
                  </button>
                  <button
                    onClick={() => removeProduct(p.id)}
                    className="btn px-3 py-2 text-sm border border-red-500 text-red-300"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="col-span-full text-center text-gray-500">No products yet.</div>
          )}
        </div>
      </div>
      <CartSidebar onSave={saveInvoice} saving={savingInvoice} />

      {openForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 animate-fade-in overflow-y-auto p-4 md:p-8">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-glow animate-scale-in mt-6 md:mt-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editing ? "Edit Product" : "Add Product"}
              </h3>
              <button onClick={() => { setOpenForm(false); resetForm(); }} className="text-[var(--text-secondary)] hover:text-[var(--foreground)]">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col gap-1">
                Name
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                Category
                <input
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                Unit
                <input
                  className={inputClass}
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                Stock
                <input
                  type="number"
                  className={inputClass}
                  value={form.currentStock}
                  onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })}
                />
              </label>
              <label className="flex flex-col gap-1">
                Buy price
                <input
                  type="number"
                  className={inputClass}
                  value={form.buyPrice}
                  onChange={(e) => setForm({ ...form, buyPrice: Number(e.target.value) })}
                />
              </label>
              <label className="flex flex-col gap-1">
                Sell price
                <input
                  type="number"
                  className={inputClass}
                  value={form.sellPrice}
                  onChange={(e) => setForm({ ...form, sellPrice: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setOpenForm(false); resetForm(); }} className="btn border border-[var(--border)]">
                Cancel
              </button>
              <button onClick={submitForm} className="btn btn-primary gap-2" disabled={loading}>
                {loading && <Loader2 className="animate-spin" size={16} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// simple input style
const inputClass =
  "input bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-3 py-2 focus:outline-none";
