"use client";

import { Product, StockMovement } from "@prisma/client";
import { useMemo, useState } from "react";
import { format } from "date-fns";

type MovementWithProduct = StockMovement & { product: Product };

export default function MovementsTable({
  movements,
  products,
}: {
  movements: MovementWithProduct[];
  products: Product[];
}) {
  const [productId, setProductId] = useState<number | "all">("all");
  const [type, setType] = useState<"all" | "CHECK_IN" | "CHECK_OUT">("all");

  const filtered = useMemo(
    () =>
      movements.filter((m) => {
        const productMatch = productId === "all" || m.productId === productId;
        const typeMatch = type === "all" || m.type === type;
        return productMatch && typeMatch;
      }),
    [movements, productId, type]
  );

  return (
    <div className="card p-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between mb-3">
        <div className="flex flex-wrap gap-3 text-sm">
          <select
            className="input"
            value={productId}
            onChange={(e) =>
              setProductId(e.target.value === "all" ? "all" : Number(e.target.value))
            }
          >
            <option value="all">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="all">All types</option>
            <option value="CHECK_IN">Check-in</option>
            <option value="CHECK_OUT">Check-out</option>
          </select>
        </div>
        <p className="text-xs text-gray-400">{filtered.length} records</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-400">
            <tr className="border-b border-[var(--border)]">
              <th className="py-2">Product</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Supplier</th>
              <th>Note</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-[var(--border)]">
                <td className="py-2">{m.product.name}</td>
                <td className={m.type === "CHECK_IN" ? "text-green-400" : "text-red-400"}>
                  {m.type.replace("_", " ")}
                </td>
                <td>{m.quantity}</td>
                <td>{m.supplierName ?? "—"}</td>
                <td className="max-w-xs truncate">{m.note ?? "—"}</td>
                <td>{format(m.date, "PP p")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
