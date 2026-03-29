"use client";

import { Invoice, Product } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { format, startOfDay, endOfDay, subDays, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { Loader2, Edit, Printer, Trash2, Plus, Save, Calendar, ChevronDown, X, FileSpreadsheet } from "lucide-react";
import { CartItem } from "../../lib/types";
import { calculateTotal } from "../../lib/cartMath";
import { exportToExcel } from "../../lib/exportInvoices";
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
  buyPrice?: number;
};

type InvoiceWithItems = Invoice & { parsedItems: InvoiceItem[] };

function parseInvoice(inv: Invoice): InvoiceWithItems {
  let parsed: InvoiceItem[] = [];
  try {
    parsed = JSON.parse(inv.items || "[]") as InvoiceItem[];
  } catch {
    console.error("Failed to parse invoice items for invoice:", inv.id);
  }
  return { ...inv, parsedItems: parsed };
}

export default function InvoiceList({ invoices, products }: { invoices: Invoice[]; products: Product[] }) {
  const parsed = useMemo(() => invoices.map(parseInvoice), [invoices]);
  const formatMoney = (n: number, fraction: number = 0) =>
    n.toLocaleString("en-PK", { minimumFractionDigits: fraction, maximumFractionDigits: fraction });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<InvoiceWithItems | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [discount, setDiscount] = useState({ value: 0, type: "AMOUNT" as "AMOUNT" | "PERCENT" });
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "week" | "month" | "custom">("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");

  const openEdit = (inv: InvoiceWithItems) => {
    setEditing(inv);
    setItems(inv.parsedItems);
    setCustomer({ name: inv.customerName, phone: inv.customerPhone ?? "" });
    setDiscount({ value: inv.discount, type: inv.discountType as any });
  };

  useEffect(() => {
    // Preload logo and QR so the print window can render them instantly
    [LOGO_VECTOR_SRC, LOGO_FALLBACK_SRC, scanmeImage.src].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    if (!editing) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTop = 0;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [editing]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get("filter");
    if (filter === "today" || filter === "yesterday" || filter === "week" || filter === "month") {
      setDateFilter(filter);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, []);

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
    const pageCss = `
      @page { size: 80mm auto; margin: 0; }
      body { width: 80mm !important; margin: 0 !important; padding: 1.5mm !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; zoom: 200%; }
    `;

    const numbers = calculateTotal({
      items: inv.parsedItems as any,
      discount: inv.discount,
      discountType: inv.discountType as any,
      customerName: inv.customerName,
      customerPhone: inv.customerPhone ?? "",
    });
    const formattedSubtotal = formatMoney(numbers.subtotal, 0);
    const formattedTotal = formatMoney(numbers.total, 0);

    const baseUrl = window.location.origin;
    const logoVector = `${baseUrl}${LOGO_VECTOR_SRC}`;
    const logoFallback = `${baseUrl}${LOGO_FALLBACK_SRC}`;
    const qrSrc = `${baseUrl}${scanmeImage.src}`;

    const html = `
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
            .logo-img {
              width: 140px;
              height: auto;
              margin: 0 auto 4pt;
              display: block;
              image-rendering: optimizeQuality;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              filter: grayscale(1) contrast(2.8) brightness(0.1);
            }
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
            .terms li { margin: 0.5pt 0; padding-left: 6pt; position: relative; font-size: 8pt; }
            .terms li:before { content: "•"; position: absolute; left: 0; }
            @media print {
              ${pageCss}
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoVector}" onerror="this.onerror=null;this.src='${logoFallback}'" alt="Logo" class="logo-img" />
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
                <th style="width:10%; text-align: center;">S.No</th>
                <th style="width:15%; text-align: center;">Qty</th>
                <th style="width:45%; text-align: left;">Product</th>
                <th style="width:15%; text-align: right;">Price</th>
                <th style="width:15%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${inv.parsedItems
                .map(
                  (it, idx) =>
                    `<tr>
                      <td style="text-align: center;">${idx + 1}</td>
                      <td style="text-align: center;">${it.quantity}</td>
                      <td>${it.name}${it.unit ? ` (${it.unit})` : ""}</td>
                      <td style="text-align: right;">Rs${Number(it.price).toLocaleString("en-PK")}</td>
                      <td style="text-align: right;">Rs${(it.price * it.quantity).toLocaleString("en-PK")}</td>
                    </tr>`
                )
                .join("")}
            </tbody>
          </table>
          <div class="totals">
            <div class="total-row">Subtotal: Rs ${formattedSubtotal}</div>
            ${inv.discount > 0 ? `<div class="discount">Discount: ${inv.discountType === "PERCENT" ? inv.discount + "%" : "Rs " + inv.discount}</div>` : ""}
            <div class="grand-total">Total: Rs ${formattedTotal}</div>
          </div>
          <div class="footer">
            <p>Thank you for business!</p>
            <p>Luckyone Mall, Karachi</p>
            <p>Ph: 03012276178</p>
            <h3 class="text-lg font-bold" style="margin: 6pt 0 0;">We love to hear your feedback!</h3>
            <h2 class="text-lg font-bold mt-8">Scan the QR Code to write a review</h2>
            <img src="${qrSrc}" alt="QR Code" style="width: 150px; height: auto; margin: 8pt auto; border: none; padding: 0;" />
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
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 1000);
          };
        </script>
      </html>
    `;

    // If running inside Electron, ask the main process to open in default browser via POST (writes temp file).
    const isElectron = navigator.userAgent.includes("Electron");
    if (isElectron) {
      fetch("/open-external", {
        method: "POST",
        headers: { "Content-Type": "text/html" },
        body: html,
      }).catch(() => {});
      return;
    }

    // Fallback: open a new tab/window and trigger print.
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      setTimeout(() => {
        win.focus();
        win.print();
      }, 500);
    };
  };

  const filtered = useMemo(() => {
    let result = parsed;

    if (dateFilter !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      result = result.filter((inv) => {
        const invDate = new Date(inv.createdAt);
        invDate.setHours(0, 0, 0, 0);

        switch (dateFilter) {
          case "today":
            return invDate.getTime() === today.getTime();
          case "yesterday": {
            const yesterday = subDays(today, 1);
            return invDate.getTime() === yesterday.getTime();
          }
          case "week":
            return invDate >= subDays(today, 7);
          case "month": {
            const monthStart = startOfMonth(today);
            const monthEnd = endOfMonth(today);
            return isWithinInterval(invDate, { start: monthStart, end: monthEnd });
          }
          case "custom":
            if (customDateFrom && customDateTo) {
              const from = startOfDay(new Date(customDateFrom));
              const to = endOfDay(new Date(customDateTo));
              return isWithinInterval(invDate, { start: from, end: to });
            }
            return true;
          default:
            return true;
        }
      });
    }

    const q = search.trim().toLowerCase();
    if (!q) return result;
    return result.filter((inv) => {
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
  }, [parsed, search, dateFilter, customDateFrom, customDateTo]);

  const calculateCost = (inv: InvoiceWithItems) => {
    return inv.parsedItems.reduce((sum, item) => {
      const buyPrice = item.buyPrice ?? 0;
      return sum + buyPrice * item.quantity;
    }, 0);
  };

  const calculateProfit = (inv: InvoiceWithItems) => {
    return inv.total - calculateCost(inv);
  };

  const printAllInvoices = () => {
    const grandTotalCost = filtered.reduce((sum, inv) => sum + calculateCost(inv), 0);
    const grandTotalSaleBeforeDiscount = filtered.reduce((sum, inv) => {
      return sum + inv.parsedItems.reduce((s, item) => s + item.price * item.quantity, 0);
    }, 0);
    const grandTotalDiscount = filtered.reduce((sum, inv) => {
      const discountValue = inv.discountType === "PERCENT" 
        ? (inv.subtotal * inv.discount) / 100 
        : inv.discount;
      return sum + discountValue;
    }, 0);
    const grandTotalSale = filtered.reduce((sum, inv) => sum + inv.total, 0);
    const grandTotalProfit = filtered.reduce((sum, inv) => sum + calculateProfit(inv), 0);

    let globalSNo = 0;
    const allProductRows = filtered.flatMap((inv) => {
      const invSubtotal = inv.parsedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const discountValue = inv.discountType === "PERCENT" 
        ? (invSubtotal * inv.discount) / 100 
        : inv.discount;
      return inv.parsedItems.map((item) => {
        globalSNo++;
        const itemCost = (item.buyPrice ?? 0) * item.quantity;
        const itemSaleBefore = item.price * item.quantity;
        const itemDiscount = invSubtotal > 0 ? (itemSaleBefore / invSubtotal) * discountValue : 0;
        const itemSaleAfter = itemSaleBefore - itemDiscount;
        return `
          <tr>
            <td class="sno">${globalSNo}</td>
            <td class="prod-name">${item.name}${item.unit ? ` (${item.unit})` : ""}</td>
            <td class="qty">${item.quantity}</td>
            <td class="cost">Rs ${itemCost.toLocaleString("en-PK")}</td>
            <td class="sale">Rs ${itemSaleAfter.toLocaleString("en-PK")}</td>
          </tr>
        `;
      });
    }).join('');

    const content = `
      <div class="receipt">
        <div class="header">
          <div class="company">S•PRINT TECH MOBILE</div>
          <div class="company">ACCESSORIES</div>
          <div class="report-title">SALES REPORT</div>
          <div class="report-info">${getFilterLabel()} — ${filtered.length} Invoices</div>
          <div class="report-info">${format(new Date(), "dd MMM yyyy, HH:mm")}</div>
          <div class="report-info">${globalSNo} Products Sold</div>
        </div>
        <div class="divider"></div>
        <table class="items-table">
          <thead>
            <tr>
              <th class="sno-col">S#</th>
              <th class="prod-col">Product</th>
              <th class="qty-col">Qty</th>
              <th class="cost-col">Cost</th>
              <th class="sale-col">Sale</th>
            </tr>
          </thead>
          <tbody>
            ${allProductRows}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="grand-total-box">
          <div class="grand-label">SUMMARY</div>
          <div class="grand-row">
            <span>Total Cost:</span>
            <span>Rs ${grandTotalCost.toLocaleString("en-PK")}</span>
          </div>
          <div class="grand-row">
            <span>Total Sale:</span>
            <span>Rs ${grandTotalSale.toLocaleString("en-PK")}</span>
          </div>
          <div class="grand-row ${grandTotalProfit >= 0 ? 'profit' : 'loss'}">
            <span>Total Profit:</span>
            <span>Rs ${grandTotalProfit >= 0 ? '+' : ''}${grandTotalProfit.toLocaleString("en-PK")}</span>
          </div>
        </div>
        <div class="footer">
          <div class="thank-you">Thank You!</div>
          <div class="footer-text">Powered by VNE Digital — www.vnedigital.com</div>
        </div>
      </div>
    `;

    const receiptStyles = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Courier New', monospace; width: 80mm; margin: 0 auto; padding: 4mm; font-size: 11px; }
      .receipt { max-width: 80mm; margin: 0 auto; }
      .header { text-align: center; margin-bottom: 6px; }
      .company { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; }
      .report-title { font-size: 14px; font-weight: 900; margin: 4px 0; color: #000; letter-spacing: 1px; }
      .report-info { font-size: 9px; color: #666; }
      .divider { border-top: 2px solid #000; margin: 5px 0; }
      .items-table { width: 100%; border-collapse: collapse; font-size: 11px; }
      .items-table th { background: #000; color: #fff; text-align: left; padding: 4px 4px; font-weight: 900; letter-spacing: 0.5px; }
      .items-table td { padding: 3px 4px; border-bottom: 1px solid #ccc; vertical-align: top; font-weight: 600; color: #111; }
      .sno-col { width: 8%; text-align: center; }
      .prod-col { width: 44%; }
      .qty-col { width: 8%; text-align: center; }
      .cost-col { width: 20%; text-align: right; }
      .sale-col { width: 20%; text-align: right; }
      .sno { text-align: center; font-weight: 900; }
      .prod-name { font-weight: 800; color: #000; }
      .qty { text-align: center; font-weight: 700; }
      .cost, .sale { text-align: right; font-weight: 800; }
      .grand-total-box { background: #000; color: #fff; padding: 8px 10px; font-weight: 900; }
      .grand-label { font-size: 16px; font-weight: 900; text-align: center; margin-bottom: 6px; border-bottom: 2px solid #fff; padding-bottom: 6px; letter-spacing: 1px; }
      .grand-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; font-weight: 700; }
      .grand-row span { font-weight: 800; }
      .grand-row.profit span:last-child { color: #86efac; font-weight: 900; }
      .grand-row.loss span:last-child { color: #fca5a5; font-weight: 900; }
      .footer { text-align: center; margin-top: 6px; padding-top: 5px; border-top: 2px solid #000; }
      .thank-you { font-size: 14px; font-weight: 900; margin-bottom: 3px; letter-spacing: 1px; }
      .footer-text { font-size: 8px; color: #666; }
      @media print { @page { size: 80mm auto; margin: 0; } body { width: 80mm !important; zoom: 200%; } }
    `;

    const isElectron = navigator.userAgent.includes("Electron");
    const fullHtml = `<!DOCTYPE html><html><head><title>Sales Report - ${getFilterLabel()}</title><style>${receiptStyles}</style></head><body>${content}<script>window.onload=function(){setTimeout(function(){window.print();},1000);}</script></body></html>`;

    if (isElectron) {
      fetch("/open-external", {
        method: "POST",
        headers: { "Content-Type": "text/html" },
        body: fullHtml,
      }).catch(() => {});
      return;
    }

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(fullHtml);
      printWindow.document.close();
    }
  };

  const totalSales = filtered.reduce((sum, inv) => sum + inv.total, 0);
  const totalProfit = filtered.reduce((sum, inv) => sum + calculateProfit(inv), 0);
  const totalCost = filtered.reduce((sum, inv) => sum + calculateCost(inv), 0);
  const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
  const isProfit = totalProfit >= 0;

  const getFilterLabel = () => {
    switch (dateFilter) {
      case "today": return "Today";
      case "yesterday": return "Yesterday";
      case "week": return "Last 7 Days";
      case "month": return "This Month";
      case "custom": return customDateFrom && customDateTo ? `${format(new Date(customDateFrom), "dd MMM")} - ${format(new Date(customDateTo), "dd MMM")}` : "Custom";
      default: return "All Time";
    }
  };

  const handleCustomApply = () => {
    if (customDateFrom && customDateTo) {
      setDateFilter("custom");
      setShowDatePicker(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="card p-4 bg-gradient-to-br from-[#1a1a22] to-[#12121a] border border-[var(--accent)]/30">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Sales</p>
          <p className="text-2xl font-bold text-[var(--accent)] mt-1">Rs {totalSales.toLocaleString("en-PK")}</p>
          <p className="text-xs text-gray-500 mt-1">{filtered.length} invoices</p>
        </div>
        <div className="card p-4 bg-gradient-to-br from-[#1a1a22] to-[#12121a] border border-orange-500/30">
          <p className="text-xs text-orange-400 uppercase tracking-wider">Total Cost</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">Rs {totalCost.toLocaleString("en-PK")}</p>
          <p className="text-xs text-gray-500 mt-1">Buy price</p>
        </div>
        <div className={`card p-4 bg-gradient-to-br from-[#1a1a22] to-[#12121a] border ${isProfit ? "border-green-500/30" : "border-red-500/30"}`}>
          <p className={`text-xs uppercase tracking-wider ${isProfit ? "text-green-400" : "text-red-400"}`}>Total Profit</p>
          <p className={`text-2xl font-bold mt-1 ${isProfit ? "text-green-400" : "text-red-400"}`}>
            Rs {totalProfit.toLocaleString("en-PK")}
          </p>
          <p className={`text-xs mt-1 ${isProfit ? "text-green-400/70" : "text-red-400/70"}`}>
            {isProfit ? "+" : ""}{profitMargin.toFixed(1)}% margin
          </p>
        </div>
        <div className="card p-4 bg-gradient-to-br from-[#1a1a22] to-[#12121a] border border-blue-500/30">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Avg Profit</p>
          <p className={`text-2xl font-bold mt-1 ${isProfit ? "text-blue-400" : "text-red-400"}`}>
            Rs {filtered.length > 0 ? Math.round(totalProfit / filtered.length).toLocaleString("en-PK") : 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">Per invoice</p>
        </div>
        <div className="card p-4 bg-gradient-to-br from-[#1a1a22] to-[#12121a] border border-purple-500/30">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Period</p>
          <p className="text-lg font-bold text-purple-400 mt-1">{getFilterLabel()}</p>
          <p className="text-xs text-gray-500 mt-1">Filtered view</p>
        </div>
      </div>

      <div className="card p-4 overflow-visible relative z-10" style={{ overflow: "visible" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "today", "yesterday", "week", "month"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => { setDateFilter(filter); setShowDatePicker(false); }}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                dateFilter === filter
                  ? "bg-[var(--accent)] text-black border-[var(--accent)]"
                  : "border-[var(--border)] text-gray-400 hover:border-[var(--accent)] hover:text-[var(--accent)]"
              }`}
            >
              {filter === "all" ? "All" : filter === "today" ? "Today" : filter === "yesterday" ? "Yesterday" : filter === "week" ? "Week" : "Month"}
            </button>
          ))}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`px-3 py-1.5 text-xs rounded-lg border flex items-center gap-1 transition-all ${
                dateFilter === "custom"
                  ? "bg-[var(--accent)] text-black border-[var(--accent)]"
                  : "border-[var(--border)] text-gray-400 hover:border-[var(--accent)] hover:text-[var(--accent)]"
              }`}
            >
              <Calendar size={12} />
              {dateFilter === "custom" ? getFilterLabel() : "Custom"}
              <ChevronDown size={12} />
            </button>
            {showDatePicker && (
              <div className="absolute top-full left-0 mt-2 bg-[#0f0f17]/98 border border-[var(--border)]/80 rounded-lg p-4 z-50 shadow-2xl backdrop-blur-md animate-scale-in">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-400">Select Date Range</p>
                  <button onClick={() => setShowDatePicker(false)} className="text-gray-500 hover:text-white">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex flex-col gap-2 mb-3">
                  <label className="text-xs text-gray-400">From</label>
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="input text-sm"
                  />
                  <label className="text-xs text-gray-400">To</label>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="input text-sm"
                  />
                </div>
                <button onClick={handleCustomApply} className="btn btn-primary w-full text-xs py-2" disabled={!customDateFrom || !customDateTo}>
                  Apply Filter
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice #, customer, phone, or product..."
              className="input w-full pr-8"
              aria-label="Search invoices"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { exportToExcel(filtered as any); toast.success(`Exported ${filtered.length} invoices to Excel!`); }}
              className="btn px-3 py-2 text-xs border border-green-500/50 text-green-400 hover:bg-green-500 hover:text-black transition-all flex items-center gap-1.5"
              title="Export to Excel"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button
              onClick={() => { printAllInvoices(); toast.success(`Printing ${filtered.length} invoices!`); }}
              className="btn px-3 py-2 text-xs border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-all flex items-center gap-1.5"
              title="Print All Invoices"
            >
              <Printer size={14} /> Print All
            </button>
          </div>
        </div>

        {(dateFilter !== "all" || search) && (
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="text-gray-400">
            Showing <span className="text-[var(--accent)]">{filtered.length}</span> of {parsed.length} invoices
            {dateFilter !== "all" && ` (${getFilterLabel()})`}
          </span>
          <button
            onClick={() => { setDateFilter("all"); setSearch(""); setCustomDateFrom(""); setCustomDateTo(""); }}
            className="text-gray-400 hover:text-[var(--accent)] flex items-center gap-1"
          >
            <X size={12} /> Clear filters
          </button>
        </div>
      )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-400">
            <tr className="border-b border-[var(--border)]">
              <th className="py-2">Invoice #</th>
              <th>Customer</th>
              <th>Products</th>
              <th>Cost</th>
              <th>Total</th>
              <th className="text-green-400">Profit</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No invoices found for the selected period
                </td>
              </tr>
            ) : filtered.map((inv) => (
              <tr key={inv.id} className="border-b border-[var(--border)] hover:bg-white/5 transition-colors">
                <td className="py-2 font-semibold">#{inv.invoiceNumber}</td>
                <td className="leading-tight">
                  <div>{inv.customerName || "Walk-in"}</div>
                  {inv.customerPhone && <div className="text-xs text-gray-400">{inv.customerPhone}</div>}
                </td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-1">
                    {inv.parsedItems.slice(0, 3).map((it, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-[var(--bg-card)] rounded text-xs border border-[var(--border)]">
                        {it.quantity}x {it.name}
                      </span>
                    ))}
                    {inv.parsedItems.length > 3 && (
                      <span className="px-2 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] rounded text-xs">
                        +{inv.parsedItems.length - 3} more
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-gray-400 font-semibold">Rs {formatMoney(calculateCost(inv), 0)}</td>
                <td className="text-[var(--accent)] font-semibold">Rs {formatMoney(inv.total, 2)}</td>
                <td className={`font-semibold ${calculateProfit(inv) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  Rs {calculateProfit(inv) >= 0 ? "+" : ""}{formatMoney(calculateProfit(inv), 0)}
                </td>
                <td>
                  <div className="text-sm">{format(inv.createdAt, "dd MMM yyyy")}</div>
                  <div className="text-xs text-gray-400">{format(inv.createdAt, "hh:mm a")}</div>
                </td>
                <td className="py-2">
                  <div className="flex gap-1.5">
                    <button onClick={() => print(inv)} className="btn px-2.5 py-1.5 text-xs border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-all" title="Print Invoice">
                      <Printer size={14} />
                    </button>
                    <button onClick={() => openEdit(inv)} className="btn px-2.5 py-1.5 text-xs border border-[var(--border)] hover:border-blue-400 hover:text-blue-400 transition-all" title="Edit Invoice">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => remove(inv.id)} className="btn px-2.5 py-1.5 text-xs border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white transition-all" title="Delete Invoice">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 md:p-8 overflow-y-auto animate-fade-in">
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
                <p className="text-sm text-gray-400">Subtotal: Rs {formatMoney(totals.subtotal, 2)}</p>
                <p className="text-sm text-gray-400">Total: Rs {formatMoney(totals.total, 2)}</p>
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
