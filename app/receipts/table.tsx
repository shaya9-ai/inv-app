"use client";

import { Product, StockMovement } from "@prisma/client";
import { format } from "date-fns";
import { openGrnPrint } from "../../lib/printInvoice";

type MovementWithProduct = StockMovement & { product: Product };

export default function ReceiptsTable({ movements }: { movements: MovementWithProduct[] }) {
  const printOne = (m: MovementWithProduct) => {
    openGrnPrint({
      receiptNumber: `GRN-${m.id}`,
      supplierName: m.supplierName ?? undefined,
      date: format(m.date, "yyyy-MM-dd HH:mm:ss"),
      items: [
        {
          name: m.product.name,
          unit: m.product.unit ?? undefined,
          quantity: m.quantity,
          price: m.buyPrice ?? 0,
        },
      ],
      subtotal: (m.buyPrice ?? 0) * m.quantity,
      discount: 0,
      discountType: "AMOUNT",
      total: (m.buyPrice ?? 0) * m.quantity,
      note: m.note ?? undefined,
    });
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
