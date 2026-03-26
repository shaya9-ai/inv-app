"use client";

import { Invoice, Product } from "@prisma/client";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Edit, Printer, Trash2, Plus, Save } from "lucide-react";
import { CartItem } from "../../lib/types";
import { calculateTotal } from "../../lib/cartMath";

type InvoiceItem = {
  productId: number;
  name: string;
  unit?: string;
  quantity: number;
  price: number;
};

type InvoiceWithItems = Invoice & { parsedItems: InvoiceItem[] };

function parseInvoice(inv: Invoice): InvoiceWithItems {
  const parsed = (JSON.parse(inv.items) as InvoiceItem[]) ?? [];
  return { ...inv, parsedItems: parsed };
}

export default function InvoiceList({ invoices, products }: { invoices: Invoice[]; products: Product[] }) {
  const parsed = useMemo(() => invoices.map(parseInvoice), [invoices]);
  const [editing, setEditing] = useState<InvoiceWithItems | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [discount, setDiscount] = useState({ value: 0, type: "AMOUNT" as "AMOUNT" | "PERCENT" });
  const [loading, setLoading] = useState(false);

  const openEdit = (inv: InvoiceWithItems) => {
    setEditing(inv);
    setItems(inv.parsedItems);
    setCustomer({ name: inv.customerName, phone: inv.customerPhone ?? "" });
    setDiscount({ value: inv.discount, type: inv.discountType as any });
  };

  const addItem = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems((prev) => [...prev, { productId, name: product.name, unit: product.unit, quantity: 1, price: product.sellPrice }]);
  };

  const totals = useMemo(() => calculateTotal({ items: items as any, discount: discount.value, discountType: discount.type as any, customerName: customer.name, customerPhone: customer.phone }), [items, discount, customer]);

  const save = async () => {
    if (!editing) return;
    setLoading(true);
    const res = await fetch("/api/invoices", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        items,
        discount: discount.value,
        discountType: discount.type,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Failed to update invoice");
      return;
    }
    toast.success("Invoice updated");
    window.location.reload();
    setEditing(null);
  };

  const remove = async (id: number) => {
    if (!confirm("Delete invoice?")) return;
    const res = await fetch("/api/invoices?id=" + id, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      window.location.reload();
    } else toast.error("Failed");
  };

  const print = (inv: InvoiceWithItems) => {
    const receiptMode = window.confirm("Use 80mm receipt mode? Cancel = A4");
    const pageCss = receiptMode
      ? "@page { size: 80mm auto; margin: 4mm; } body { width: 76mm; }"
      : "@page { size: A4; margin: 12mm; }";
    const numbers = calculateTotal({
      items: inv.parsedItems as any,
      discount: inv.discount,
      discountType: inv.discountType as any,
      customerName: inv.customerName,
      customerPhone: inv.customerPhone ?? "",
    });
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Invoice #${inv.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            td, th { border: 1px solid #000; padding: 6px; font-size: 12px; }
            h1 { margin: 0; }
            @media print { body { -webkit-print-color-adjust: exact; } ${pageCss} }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <h1>Invoice</h1>
              <p>${inv.customerName} (${inv.customerPhone ?? "-"})</p>
            </div>
            <div style="text-align:right">
              <p>#${inv.invoiceNumber}</p>
              <p>${format(inv.createdAt, "PPpp")}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Sr#</th><th>Product</th><th>Qty</th><th>Unit</th><th>Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${inv.parsedItems
                .map(
                  (it, idx) =>
                    `<tr><td>${idx + 1}</td><td>${it.name}</td><td>${it.quantity}</td><td>${it.unit ?? ""}</td><td>Rs ${it.price}</td><td>Rs ${(it.price * it.quantity).toFixed(2)}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
          <p style="text-align:right; margin-top:12px;">Subtotal: Rs ${numbers.subtotal.toFixed(2)}</p>
          <p style="text-align:right;">Discount: ${inv.discount} ${inv.discountType}</p>
          <p style="text-align:right; font-weight:bold; font-size:16px;">Grand Total: Rs ${numbers.total.toFixed(2)}</p>
          <p style="margin-top:18px;">Thank you for your business!</p>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="card p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-400">
            <tr className="border-b border-[var(--border)]">
              <th className="py-2">Invoice #</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {parsed.map((inv) => (
              <tr key={inv.id} className="border-b border-[var(--border)]">
                <td className="py-2 font-semibold">#{inv.invoiceNumber}</td>
                <td>{inv.customerName}</td>
                <td className="text-[var(--accent)]">Rs {inv.total.toFixed(2)}</td>
                <td>{format(inv.createdAt, "PP")}</td>
                <td className="flex gap-2 py-2">
                  <button onClick={() => openEdit(inv)} className="btn px-2 py-1 text-xs border border-[var(--border)]">
                    <Edit size={14} /> Edit
                  </button>
                  <button onClick={() => print(inv)} className="btn px-2 py-1 text-xs border border-[var(--border)]">
                    <Printer size={14} /> Print
                  </button>
                  <button onClick={() => remove(inv.id)} className="btn px-2 py-1 text-xs border border-red-500 text-red-400">
                    <Trash2 size={14} /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-glow animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Invoice #{editing.invoiceNumber}</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <label className="flex flex-col gap-1">
                Customer Name
                <input
                  className="input"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                Phone
                <input
                  className="input"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                Discount
                <input
                  type="number"
                  className="input"
                  value={discount.value}
                  onChange={(e) => setDiscount({ ...discount, value: Number(e.target.value) })}
                />
              </label>
              <label className="flex flex-col gap-1">
                Discount Type
                <select
                  className="input"
                  value={discount.type}
                  onChange={(e) => setDiscount({ ...discount, type: e.target.value as any })}
                >
                  <option value="AMOUNT">Amount</option>
                  <option value="PERCENT">Percent</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <select
                className="input flex-1"
                onChange={(e) => addItem(Number(e.target.value))}
                defaultValue=""
              >
                <option value="" disabled>
                  Add product...
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => addItem(products[0]?.id ?? 0)}
                className="btn border border-[var(--border)]"
              >
                <Plus size={16} /> Quick add first
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400 text-left">
                  <tr className="border-b border-[var(--border)]">
                    <th className="py-2">Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} className="border-b border-[var(--border)]">
                      <td className="py-2">{it.name}</td>
                      <td>
                        <input
                          type="number"
                          className="input w-20"
                          value={it.quantity}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, quantity: Number(e.target.value) } : p))
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="input w-24"
                          value={it.price}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, price: Number(e.target.value) } : p))
                            )
                          }
                        />
                      </td>
                      <td>Rs {(it.quantity * it.price).toFixed(2)}</td>
                      <td>
                        <button
                          onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-400"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div>
                <p className="text-sm text-gray-400">Subtotal: Rs {totals.subtotal.toFixed(2)}</p>
                <p className="text-sm text-gray-400">Total: Rs {totals.total.toFixed(2)}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditing(null)} className="btn border border-[var(--border)]">
                  Cancel
                </button>
                <button onClick={save} className="btn btn-primary gap-2" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" size={16} />}
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
