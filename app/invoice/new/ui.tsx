"use client";

import { Product } from "@prisma/client";
import { useCart } from "../../../components/cart-provider";
import CartSidebar from "../../../components/cart-sidebar";
import { useState } from "react";
import { toast } from "sonner";
import { calculateTotal } from "../../../lib/cartMath";

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
      openPrint(invoice);
    }
    clear();
  };

  const openPrint = (invoice: any) => {
    const receiptMode = window.confirm("Use 80mm receipt mode? Cancel = A4");
    const pageCss = receiptMode
      ? "@page { size: 80mm auto; margin: 4mm; } body { width: 76mm; }"
      : "@page { size: A4; margin: 12mm; }";
    const numbers = calculateTotal({
      items: invoice.parsedItems ?? state.items,
      discount: invoice.discount,
      discountType: invoice.discountType,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
    });
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Invoice #${invoice.invoiceNumber}</title>
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
              <p>${invoice.customerName} (${invoice.customerPhone ?? "-"})</p>
            </div>
            <div style="text-align:right">
              <p>#${invoice.invoiceNumber}</p>
              <p>${invoice.createdAt}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Sr#</th><th>Product</th><th>Qty</th><th>Unit</th><th>Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${(invoice.parsedItems ?? state.items)
                .map(
                  (it: any, idx: number) =>
                    `<tr><td>${idx + 1}</td><td>${it.name}</td><td>${it.quantity}</td><td>${it.unit ?? ""}</td><td>${it.price}</td><td>${(it.price * it.quantity).toFixed(2)}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
          <p style="text-align:right; margin-top:12px;">Subtotal: Rs ${numbers.subtotal.toFixed(2)}</p>
          <p style="text-align:right;">Discount: ${invoice.discount} ${invoice.discountType}</p>
          <p style="text-align:right; font-weight:bold; font-size:16px;">Grand Total: Rs ${numbers.total.toFixed(2)}</p>
          <p style="margin-top:18px;">Thank you for your business!</p>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
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

