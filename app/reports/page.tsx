import AppShell from "../../components/app-shell";
import { prisma } from "../../lib/prisma";
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

export const dynamic = "force-dynamic";

type PeriodData = {
  label: string;
  totalSales: number;
  totalProfit: number;
  totalInvoices: number;
  avgOrderValue: number;
  avgProfitPerInvoice: number;
  profitMargin: number;
  topProducts: { name: string; quantity: number; total: number }[];
  topCustomers: { name: string; count: number; total: number }[];
};

async function getReportData() {
  const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" } });
  const products = await prisma.product.findMany();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const yesterdayStart = startOfDay(subDays(today, 1));
  const yesterdayEnd = endOfDay(subDays(today, 1));
  const weekStart = subDays(today, 7);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const todayInvoices = invoices.filter((i) => isWithinInterval(new Date(i.createdAt), { start: todayStart, end: todayEnd }));
  const yesterdayInvoices = invoices.filter((i) => isWithinInterval(new Date(i.createdAt), { start: yesterdayStart, end: yesterdayEnd }));
  const weekInvoices = invoices.filter((i) => isWithinInterval(new Date(i.createdAt), { start: weekStart, end: todayEnd }));
  const monthInvoices = invoices.filter((i) => isWithinInterval(new Date(i.createdAt), { start: monthStart, end: monthEnd }));

  const calculateStats = (invList: typeof invoices): PeriodData["topProducts"] => {
    const productSales = new Map<number, { name: string; quantity: number; total: number }>();
    
    for (const inv of invList) {
      let items: { productId: number; name: string; quantity: number; price: number; buyPrice?: number }[] = [];
      try {
        items = JSON.parse(inv.items || "[]");
      } catch {
        console.error("Failed to parse items for invoice:", inv.id);
        continue;
      }
      for (const item of items) {
        const existing = productSales.get(item.productId) || { name: item.name, quantity: 0, total: 0 };
        existing.quantity += item.quantity;
        existing.total += item.quantity * item.price;
        productSales.set(item.productId, existing);
      }
    }
    
    return Array.from(productSales.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  };

  const calculateCustomers = (invList: typeof invoices): PeriodData["topCustomers"] => {
    const customerStats = new Map<string, { count: number; total: number }>();
    
    for (const inv of invList) {
      const name = inv.customerName || "Walk-in";
      const existing = customerStats.get(name) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += inv.total;
      customerStats.set(name, existing);
    }
    
    return Array.from(customerStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  };

  const calculateProfit = (invList: typeof invoices): number => {
    let totalProfit = 0;
    for (const inv of invList) {
      let items: { buyPrice?: number; quantity: number; price: number }[] = [];
      try {
        items = JSON.parse(inv.items || "[]");
      } catch {
        continue;
      }
      for (const item of items) {
        const buyPrice = item.buyPrice ?? 0;
        totalProfit += (item.price - buyPrice) * item.quantity;
      }
    }
    return totalProfit;
  };

  const calcPeriod = (label: string, invList: typeof invoices): PeriodData => {
    const totalSales = invList.reduce((sum, i) => sum + i.total, 0);
    const totalProfit = calculateProfit(invList);
    return {
      label,
      totalSales,
      totalProfit,
      totalInvoices: invList.length,
      avgOrderValue: invList.length > 0 ? totalSales / invList.length : 0,
      avgProfitPerInvoice: invList.length > 0 ? totalProfit / invList.length : 0,
      profitMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
      topProducts: calculateStats(invList),
      topCustomers: calculateCustomers(invList),
    };
  };

  return {
    today: calcPeriod("Today", todayInvoices),
    yesterday: calcPeriod("Yesterday", yesterdayInvoices),
    last7Days: calcPeriod("Last 7 Days", weekInvoices),
    thisMonth: calcPeriod("This Month", monthInvoices),
    allTime: calcPeriod("All Time", invoices),
  };
}

export default async function ReportsPage() {
  const data = await getReportData();

  return (
    <AppShell title="Sales Reports">
      <div className="space-y-6">
        <SummaryCard data={data.today} previousData={data.yesterday} />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PeriodCard data={data.last7Days} icon="7D" />
          <PeriodCard data={data.thisMonth} icon="MTD" />
          <PeriodCard data={data.allTime} icon="ALL" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopProductsCard data={data.today.topProducts} />
          <TopCustomersCard data={data.today.topCustomers} />
        </div>
      </div>
    </AppShell>
  );
}

function SummaryCard({ data, previousData }: { data: PeriodData; previousData: PeriodData }) {
  const salesChange = previousData.totalSales > 0 
    ? ((data.totalSales - previousData.totalSales) / previousData.totalSales) * 100 
    : 0;
  const invoiceChange = previousData.totalInvoices > 0 
    ? ((data.totalInvoices - previousData.totalInvoices) / previousData.totalInvoices) * 100 
    : 0;
  const profitChange = previousData.totalProfit > 0 
    ? ((data.totalProfit - previousData.totalProfit) / previousData.totalProfit) * 100 
    : 0;
  const isProfit = data.totalProfit >= 0;

  return (
    <div className="card p-6 shine animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-400">Daily Sales Summary</p>
          <h2 className="text-2xl font-bold mt-1">{data.label}</h2>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">{format(new Date(), "EEEE, dd MMM yyyy")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Sales</p>
          <p className="text-2xl font-bold text-[var(--accent)] mt-1">
            Rs {data.totalSales.toLocaleString("en-PK")}
          </p>
          <p className={`text-xs mt-1 ${salesChange >= 0 ? "text-green-400" : "text-red-400"}`}>
            {salesChange >= 0 ? "▲" : "▼"} {Math.abs(salesChange).toFixed(1)}%
          </p>
        </div>

        <div>
          <p className={`text-xs uppercase tracking-wider ${isProfit ? "text-green-400" : "text-red-400"}`}>Total Profit</p>
          <p className={`text-2xl font-bold mt-1 ${isProfit ? "text-green-400" : "text-red-400"}`}>
            Rs {data.totalProfit.toLocaleString("en-PK")}
          </p>
          <p className={`text-xs mt-1 ${profitChange >= 0 ? "text-green-400" : "text-red-400"}`}>
            {profitChange >= 0 ? "▲" : "▼"} {Math.abs(profitChange).toFixed(1)}%
          </p>
        </div>

        <div>
          <p className={`text-xs uppercase tracking-wider ${isProfit ? "text-green-400" : "text-red-400"}`}>Profit Margin</p>
          <p className={`text-2xl font-bold mt-1 ${isProfit ? "text-green-400" : "text-red-400"}`}>
            {isProfit ? "+" : ""}{data.profitMargin.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">of sales</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Invoices</p>
          <p className="text-2xl font-bold mt-1">{data.totalInvoices}</p>
          <p className={`text-xs mt-1 ${invoiceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
            {invoiceChange >= 0 ? "▲" : "▼"} {Math.abs(invoiceChange).toFixed(1)}%
          </p>
        </div>

        <div>
          <p className={`text-xs uppercase tracking-wider ${isProfit ? "text-green-400" : "text-red-400"}`}>Avg Profit</p>
          <p className={`text-2xl font-bold mt-1 ${isProfit ? "text-green-400" : "text-red-400"}`}>
            Rs {Math.round(data.avgProfitPerInvoice).toLocaleString("en-PK")}
          </p>
          <p className="text-xs text-gray-500 mt-1">per invoice</p>
        </div>
      </div>
    </div>
  );
}

function PeriodCard({ data, icon }: { data: PeriodData; icon: string }) {
  const isProfit = data.totalProfit >= 0;
  return (
    <div className="card p-4 animate-scale-in">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400 uppercase tracking-wider">{data.label}</p>
        <span className="text-xs px-2 py-1 rounded bg-[var(--accent)]/20 text-[var(--accent)] font-bold">
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-[var(--accent)]">
        Rs {data.totalSales.toLocaleString("en-PK")}
      </p>
      <p className={`text-lg font-bold mt-1 ${isProfit ? "text-green-400" : "text-red-400"}`}>
        {isProfit ? "Profit" : "Loss"}: Rs {Math.abs(data.totalProfit).toLocaleString("en-PK")}
      </p>
      <p className={`text-xs mt-1 ${isProfit ? "text-green-400/70" : "text-red-400/70"}`}>
        {data.totalInvoices} invoices • {isProfit ? "+" : ""}{data.profitMargin.toFixed(1)}% margin
      </p>
    </div>
  );
}

function TopProductsCard({ data }: { data: PeriodData["topProducts"] }) {
  const maxTotal = Math.max(...data.map((p) => p.total), 1);

  return (
    <div className="card p-4 animate-fade-in">
      <p className="text-sm text-gray-400 uppercase tracking-wider mb-4">Top Selling Products - Today</p>
      {data.length === 0 ? (
        <p className="text-gray-500 text-sm py-8 text-center">No sales today</p>
      ) : (
        <div className="space-y-3">
          {data.map((product, idx) => (
            <div key={product.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 w-5">{idx + 1}.</span>
                  <span className="text-sm font-medium">{product.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-[var(--accent)]">
                    Rs {product.total.toLocaleString("en-PK")}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">{product.quantity} pcs</span>
                </div>
              </div>
              <div className="h-2 bg-[var(--bg-card)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--accent)] to-[#ffd36a] rounded-full transition-all duration-500"
                  style={{ width: `${(product.total / maxTotal) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopCustomersCard({ data }: { data: PeriodData["topCustomers"] }) {
  const maxTotal = Math.max(...data.map((c) => c.total), 1);

  return (
    <div className="card p-4 animate-fade-in">
      <p className="text-sm text-gray-400 uppercase tracking-wider mb-4">Top Customers - Today</p>
      {data.length === 0 ? (
        <p className="text-gray-500 text-sm py-8 text-center">No customers today</p>
      ) : (
        <div className="space-y-3">
          {data.map((customer, idx) => (
            <div key={customer.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 w-5">{idx + 1}.</span>
                  <span className="text-sm font-medium">{customer.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-[var(--accent)]">
                    Rs {customer.total.toLocaleString("en-PK")}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">{customer.count} orders</span>
                </div>
              </div>
              <div className="h-2 bg-[var(--bg-card)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${(customer.total / maxTotal) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
