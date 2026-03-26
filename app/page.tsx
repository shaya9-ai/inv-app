import AppShell from "../components/app-shell";
import { prisma } from "../lib/prisma";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

async function getStats() {
  const [products, invoices, movements] = await Promise.all([
    prisma.product.findMany(),
    prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.stockMovement.findMany({
      orderBy: { date: "desc" },
      include: { product: true },
      take: 5,
    }),
  ]);

  const totalStockValue = products.reduce(
    (sum, p) => sum + p.currentStock * p.sellPrice,
    0
  );
  const todaySales = invoices
    .filter((i) => format(i.createdAt, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"))
    .reduce((sum, i) => sum + i.total, 0);
  const lowStock = products.filter((p) => p.currentStock < 5);

  return { products, invoices, movements, totalStockValue, todaySales, lowStock };
}

export default async function Home() {
  const { products, invoices, movements, totalStockValue, todaySales, lowStock } =
    await getStats();

  return (
    <AppShell title="Dashboard">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Products" value={products.length.toString()} sub="Active SKUs" />
        <StatCard
          label="Stock Value"
          value={`Rs ${totalStockValue.toFixed(0)}`}
          sub="Sell price x qty"
        />
        <StatCard label="Today Sales" value={`Rs ${todaySales.toFixed(0)}`} sub="Invoices" />
        <StatCard
          label="Low Stock"
          value={`${lowStock.length}`}
          sub="<5 units"
          alert
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400">Recent Movements</p>
            <a className="text-xs text-[var(--accent)]" href="/movements">
              View all
            </a>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {movements.length === 0 && (
              <p className="text-sm text-gray-500 py-3">No movement yet.</p>
            )}
            {movements.map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold">
                    {m.type === "CHECK_IN" ? "Check-in" : "Check-out"} {m.product.name}
                  </p>
                  <p className="text-gray-400">
                    {m.quantity} pcs - {format(m.date, "PP p")}
                  </p>
                </div>
                <p className="text-gray-300">Qty {m.quantity}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400">Recent Invoices</p>
            <a className="text-xs text-[var(--accent)]" href="/invoice">
              View all
            </a>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {invoices.length === 0 && (
              <p className="text-sm text-gray-500 py-3">No invoice yet.</p>
            )}
            {invoices.map((inv) => (
              <div key={inv.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold">#{inv.invoiceNumber}</p>
                  <p className="text-gray-400">
                    {inv.customerName || "Walk-in"} - {format(inv.createdAt, "PP")}
                  </p>
                </div>
                <p className="text-[var(--accent)] font-semibold">Rs {inv.total.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="card p-4 mt-6 animate-fade-in">
          <p className="text-sm text-gray-400 mb-2">Low Stock Alerts</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {lowStock.map((p) => (
              <div key={p.id} className="p-3 rounded-lg bg-[#1a1a22] border border-[var(--border)] shine">
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-gray-400">{p.category}</p>
                <p className="text-sm text-red-400 mt-1">{p.currentStock} left</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  sub,
  alert = false,
}: {
  label: string;
  value: string;
  sub: string;
  alert?: boolean;
}) {
  return (
    <div className="card p-4 shine animate-scale-in">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className={alert ? "text-red-400 text-sm" : "text-gray-400 text-sm"}>{sub}</p>
    </div>
  );
}
