"use client";

import { Product, StockMovement } from "@prisma/client";
import { format } from "date-fns";

type MovementWithProduct = StockMovement & { product: Product };

export default function ReceiptsTable({ movements }: { movements: MovementWithProduct[] }) {
  const printOne = (m: MovementWithProduct) => {
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    const total = (m.buyPrice ?? 0) * m.quantity;
    win.document.write(`
      <html>
        <head>
          <title>Receipt #GRN-${m.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            td, th { border: 1px solid #000; padding: 6px; font-size: 12px; }
            h1 { margin: 0; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <h1>Receipt / GRN</h1>
              <p>Supplier: ${m.supplierName ?? "-"}</p>
            </div>
            <div style="text-align:right">
              <p>#GRN-${m.id}</p>
              <p>${format(m.date, "PPpp")}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Sr#</th><th>Product</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>${m.product.name}</td>
                <td>${m.quantity}</td>
                <td>${m.product.unit ?? ""}</td>
                <td>Rs ${m.buyPrice ?? 0}</td>
                <td>Rs ${total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <p style="text-align:right; margin-top:12px; font-weight:bold;">Grand Total: Rs ${total.toFixed(2)}</p>
          <p style="margin-top:18px;">Thank you.</p>
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
              <th className="py-2">Receipt #</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Buy Price</th>
              <th>Supplier</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id} className="border-b border-[var(--border)]">
                <td className="py-2 font-semibold">GRN-{m.id}</td>
                <td>{m.product.name}</td>
                <td>{m.quantity}</td>
                <td>Rs {m.buyPrice ?? 0}</td>
                <td>{m.supplierName ?? "-"}</td>
                <td>{format(m.date, "PP")}</td>
                <td>
                  <button onClick={() => printOne(m)} className="btn px-2 py-1 text-xs border border-[var(--border)]">
                    Print
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
