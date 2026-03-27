"use client";

import { Invoice, Product } from "@prisma/client";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Edit, Printer, Trash2, Plus, Save } from "lucide-react";
import { CartItem } from "../../lib/types";
import { calculateTotal } from "../../lib/cartMath";
import scanmeImage from "../../public/scanme.png";
import logoImage from "../../public/logo.png";

const LOGO_VECTOR_SRC = "/logo.ai";
const LOGO_FALLBACK_SRC = logoImage.src;

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
  const [search, setSearch] = useState("");
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
      ? `
        @page { size: 80mm auto; margin: 0; }
        body { width: 80mm !important; margin: 0 !important; padding: 1.5mm !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; zoom: 200%; }
      `
      : `
        @page { size: A4 portrait; margin: 80mm; }
        body { max-width: 190mm; margin: 80mm; }
      `;
    
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
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; image-rendering: crisp-edges; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              padding: 0; 
              margin: 0;
              color: #000; 
              background: white;
              line-height: 1.1;
              font-weight: 700;
            }
            table { width: 100%; border-collapse: collapse; margin: 3pt 0; border: 2pt solid #000; }
            td, th { border: 2pt solid #000; padding: 2pt 2pt; font-size: 10pt; text-align: left; line-height: 1.1; font-weight: 700; }
            th { font-weight: bold; background: #000; color: #fff; }
            .header { margin-bottom: 2pt; text-align: center; border-bottom: 3pt solid #000; padding-bottom: 2pt; }
            .header svg { margin: 0 auto 2pt; }
            .invoice-title { font-size: 12pt; font-weight: bold; margin: 0; }
            .company { font-size: 15pt; margin: 6pt 0; font-weight: 700; }
            .customer { font-size: 9pt; margin: 1pt 0; font-weight: 700; }
            .invoice-num { font-size: 9pt; margin: 1pt 0; font-weight: bold; }
            .date { font-size: 9pt; margin: 1pt 0; font-weight: bold; }
            .totals { margin: 2pt 0; font-size: 10pt; border-top: 3pt solid #000; padding-top: 2pt; }
            .total-row { text-align: right; font-weight: bold; }
            .discount { text-align: right; font-size: 9pt; font-weight: 700; }
            .grand-total { text-align: right; font-weight: bold; font-size: 11pt; border-top: 3pt solid #000; margin-top: 1pt; padding-top: 2pt; }
            .footer { font-size: 8pt; margin-top: 3pt; line-height: 1.1; text-align: center; font-weight: 700; border-top: 3pt solid #000; padding-top: 2pt; }
            .footer p { margin: 1pt 0; }
            .footer img { margin: 4pt auto; display: block; border: none; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .terms { font-size: 7pt; margin-top: 2pt; line-height: 1.08; text-align: left; }
            .terms strong { font-weight: bold; }
            .terms ul { margin: 1pt 0 0 0; padding: 0; list-style-type: none;  }
            .terms li { margin: 0.5pt 0; padding-left: 6pt; position: relative; font-size: 10pt; }
            .terms li:before { content: "•"; position: absolute; left: 0; }
            @media print {
              ${pageCss}
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${LOGO_VECTOR_SRC}" onerror="this.onerror=null;this.src='${LOGO_FALLBACK_SRC}'" alt="Logo" style="width: 140px; height: auto; margin: 0 auto 4pt; display: block; image-rendering: optimizeQuality;" />
            <div class="company">S•PRINT TECH MOBILE</div>
            <div class="company">ACCESSORIES</div>
            <div class="invoice-num">#${inv.invoiceNumber}</div>
            <div class="date">${format(inv.createdAt, "dd MMM yyyy, HH:mm")}</div>
            ${inv.customerName ? `<div class="customer"><strong>${inv.customerName}</strong></div>` : ""}
            ${inv.customerPhone ? `<div class="customer">Ph: ${inv.customerPhone}</div>` : ""}
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:15%; text-align: center;">Qty</th>
                <th style="width:50%; text-align: left;">Product</th>
                <th style="width:17%; text-align: right;">Price</th>
                <th style="width:18%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${inv.parsedItems
                .map(
                  (it) =>
                    `<tr>
                      <td style="text-align: center;">${it.quantity}x</td>
                      <td>${it.name}${it.unit ? ` (${it.unit})` : ""}</td>
                      <td style="text-align: right;">Rs${it.price}</td>
                      <td style="text-align: right;">Rs${(it.price * it.quantity).toFixed(0)}</td>
                    </tr>`
                )
                .join("")}
            </tbody>
          </table>
          <div class="totals">
            <div class="total-row">Subtotal: Rs ${numbers.subtotal.toFixed(0)}</div>
            ${inv.discount > 0 ? `<div class="discount">Discount: ${inv.discount}${inv.discountType === "PERCENT" ? "%" : ""}</div>` : ""}
            <div class="grand-total">Total: Rs ${numbers.total.toFixed(0)}</div>
          </div>
          <div class="footer">
            <p>Thank you for business!</p>
            <p>Luckyone Mall, Karachi</p>
            <p>Ph: 03012276178</p>
            <h3 class="text-lg font-bold" style="margin: 6pt 0 0;">We love to hear your feedback!</h3>
            <h2 class="text-lg font-bold mt-8">Scan the QR Code to write a review</h2>
            <img src="${scanmeImage.src}" alt="QR Code" style="width: 150px; height: auto; margin: 8pt auto; border: none; padding: 0;" />
            <div class="terms">
              <strong>Terms & Conditions:</strong>
              <ul>
                <li>Items can be exchanged for equal or higher value at any store location.</li>
                <li>Original receipt is required for exchange within 7 days of purchase.</li>
                <li>Products must be unused and in original condition with packaging.</li>
                <li>Refunds are only processed at the original store of purchase.</li>
                <li>Items bought at full price will be exchanged at the current price.</li>
                <li>Items without proper packaging (e.g., box) will not be accepted for exchange.</li>
                </ul>
                <strong>Helpline:</strong>
                <li>In case of any issue kindly contact us at :<strong>03012276178</strong>.</li>
            </div>
            <div class="footer">
            <p>----------------------</p>
            <p>Powered by VNE Digital</p>
            <p>www.vnedigital.com</p>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parsed;
    return parsed.filter((inv) => {
      const haystack = [
        inv.invoiceNumber,
        inv.customerName,
        inv.customerPhone ?? "",
        ...inv.parsedItems.map((it) => it.name),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [parsed, search]);

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex-1 min-w-[240px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, customer, phone, or product..."
            className="input w-full"
            aria-label="Search invoices"
          />
        </div>
        {search && (
          <span className="text-xs text-gray-400">
            Showing {filtered.length}/{parsed.length} result{filtered.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
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
            {filtered.map((inv) => (
              <tr key={inv.id} className="border-b border-[var(--border)]">
                <td className="py-2 font-semibold">#{inv.invoiceNumber}</td>
                <td className="leading-tight">
                  <div>{inv.customerName}</div>
                  {inv.customerPhone && <div className="text-xs text-gray-400">{inv.customerPhone}</div>}
                </td>
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
