import AppShell from "../components/app-shell";
import { prisma } from "../lib/prisma";
import { format, addMonths, startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

async function getStats() {
  const [products, invoices, movements] = await Promise.all([
    prisma.product.findMany(),
    prisma.invoice.findMany({ orderBy: { createdAt: "desc" } }),
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

  // Build last 6 months sales (including current)
  const monthBuckets = new Map<string, number>();
  for (const inv of invoices) {
    const key = format(inv.createdAt, "yyyy-MM");
    monthBuckets.set(key, (monthBuckets.get(key) || 0) + Number(inv.total ?? 0));
  }
  const monthlySales = Array.from({ length: 6 })
    .map((_, idx) => {
      const d = startOfMonth(addMonths(new Date(), -idx));
      const key = format(d, "yyyy-MM");
      return {
        key,
        label: format(d, "MMM yy"),
        total: monthBuckets.get(key) || 0,
      };
    })
    .reverse(); // oldest -> newest

  return {
    products,
    invoices: invoices.slice(0, 5),
    movements,
    totalStockValue,
    todaySales,
    lowStock,
    monthlySales,
  };
}

export default async function Home() {
  const { products, invoices, movements, totalStockValue, todaySales, lowStock, monthlySales } = await getStats();

  return (
    <AppShell title="Dashboard">
      <div className="card mb-6 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between shine animate-fade-in">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-gray-400">Inventory Management</p>
          <h2 className="text-2xl md:text-3xl font-bold mt-1 leading-tight">Welcome back</h2>
          <p className="text-sm text-gray-400">by VNE DIGITAL</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <a href="/invoice/new" className="btn btn-primary text-sm px-4 py-2">New Invoice</a>
          <a href="/inventory" className="btn text-sm px-4 py-2 border border-[var(--border)]">View Inventory</a>
        </div>
      </div>

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

      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-gray-400">Last 6 Months</p>
            <p className="text-lg font-semibold">Sales (Rs)</p>
          </div>
        </div>
        <MonthlyBarChart data={monthlySales} />
      </div>

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

function MonthlyBarChart({ data }: { data: { label: string; total: number }[] }) {
  const totals = data.map((d) => Number(d.total) || 0);
  const max = Math.max(1, ...totals);
  return (
    <div className="relative h-56">
      <div className="absolute inset-0 pointer-events-none">
        {[20, 50, 80].map((p) => (
          <div key={p} className="absolute inset-x-0" style={{ bottom: `${p}%` }}>
            <div className="border-t border-white/5" />
          </div>
        ))}
      </div>
      <div className="flex items-end gap-4 h-full">
      {data.map((d, idx) => {
        const value = Number(d.total) || 0;
        const height = Math.max((value / max) * 100, value > 0 ? 12 : 6);
        return (
          <div key={d.label} className="flex-1 h-full flex flex-col items-center gap-2 group">
            <div className="relative w-3/4 flex items-end justify-center" style={{ height: "100%" }}>
              <div
                className="w-full rounded-lg bg-gradient-to-t from-[var(--accent)] to-[#ffd36a] shadow-[0_6px_18px_rgba(0,0,0,0.25)] transition-all duration-500 group-hover:scale-[1.05] animate-bar-rise"
                style={{ height: `${height}%`, minHeight: "8px", animationDelay: `${idx * 80}ms` }}
                title={`${d.label}: Rs ${value.toFixed(0)}`}
              />
              {value > 0 && (
                <span className="absolute -top-6 text-[11px] font-semibold text-[var(--accent)]">
                  Rs {value.toFixed(0)}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-300 text-center leading-tight mt-1">
              <div>{d.label}</div>
              <div className="text-[10px] text-gray-500">Rs {value.toFixed(0)}</div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
