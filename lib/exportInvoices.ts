import * as XLSX from "xlsx";
import { Invoice } from "@prisma/client";
import { format } from "date-fns";

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

function calculateCost(inv: InvoiceWithItems): number {
  return inv.parsedItems.reduce((sum, item) => {
    const buyPrice = item.buyPrice ?? 0;
    return sum + buyPrice * item.quantity;
  }, 0);
}

function calculateProfit(inv: InvoiceWithItems): number {
  return inv.parsedItems.reduce((sum, item) => {
    const buyPrice = item.buyPrice ?? 0;
    return sum + (item.price - buyPrice) * item.quantity;
  }, 0);
}

// Professional styling helpers
const headerStyle = {
  bold: true,
  fill: "1E3A8A", // Deep blue
  color: "FFFFFF", // White text
  border: {
    left: { style: "medium", color: "1E3A8A" },
    right: { style: "medium", color: "1E3A8A" },
    top: { style: "medium", color: "1E3A8A" },
    bottom: { style: "medium", color: "1E3A8A" },
  },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  font: { name: "Calibri", sz: 11 },
};

const dataStyle = (bgColor?: string) => ({
  border: {
    left: { style: "thin", color: "CBD5E1" },
    right: { style: "thin", color: "CBD5E1" },
    top: { style: "thin", color: "CBD5E1" },
    bottom: { style: "thin", color: "CBD5E1" },
  },
  fill: bgColor ? bgColor : "FFFFFF",
  alignment: { horizontal: "left", vertical: "center" },
  font: { name: "Calibri", sz: 10 },
});

const numberStyle = (bgColor?: string) => ({
  border: {
    left: { style: "thin", color: "CBD5E1" },
    right: { style: "thin", color: "CBD5E1" },
    top: { style: "thin", color: "CBD5E1" },
    bottom: { style: "thin", color: "CBD5E1" },
  },
  fill: bgColor ? bgColor : "FFFFFF",
  alignment: { horizontal: "right", vertical: "center" },
  numFmt: '"Rs "#,##0',
  font: { name: "Calibri", sz: 10 },
});

const footerStyle = {
  bold: true,
  fill: "059669", // Emerald green
  color: "FFFFFF",
  border: {
    left: { style: "medium", color: "047857" },
    right: { style: "medium", color: "047857" },
    top: { style: "medium", color: "047857" },
    bottom: { style: "medium", color: "047857" },
  },
  alignment: { horizontal: "center", vertical: "center" },
  font: { name: "Calibri", sz: 11 },
  numFmt: '"Rs "#,##0',
};

export function exportToExcel(invoices: Invoice[], filename: string = "invoices") {
  const parsed = invoices.map(parseInvoice);
  
  let totalCostSum = 0;
  let totalSaleSum = 0;
  let totalProfitSum = 0;
  let totalDiscountSum = 0;

  const data: any[] = [];

  // Title row
  data.push([
    { v: "SALES INVOICE REPORT", s: { bold: true, fill: "0F172A", color: "FFFFFF", fontSize: 14, alignment: { horizontal: "left", vertical: "center" }, border: { style: "none" } } },
  ]);
  data.push([{ v: "", s: {} }]);
  data.push([{ v: `Generated: ${format(new Date(), "MMMM dd, yyyy - HH:mm")}`, s: { italic: true, fill: "F1F5F9", alignment: { horizontal: "left" }, font: { sz: 9 } } }]);
  data.push([{ v: "", s: {} }]);

  // Header row
  data.push([
    { v: "Invoice #", s: headerStyle },
    { v: "Date", s: headerStyle },
    { v: "Customer", s: headerStyle },
    { v: "Phone", s: headerStyle },
    { v: "Products", s: headerStyle },
    { v: "Discount", s: headerStyle },
    { v: "Cost (Rs)", s: headerStyle },
    { v: "Sale (Rs)", s: headerStyle },
    { v: "Profit (Rs)", s: headerStyle },
  ]);

  parsed.forEach((inv, idx) => {
    const cost = calculateCost(inv);
    const profit = calculateProfit(inv);
    const profitColor = profit >= 0 ? "D1FAE5" : "FEE2E2"; // Light green for profit, light red for loss
    
    totalCostSum += cost;
    totalSaleSum += inv.total;
    totalProfitSum += profit;
    totalDiscountSum += inv.discount;

    const itemsList = inv.parsedItems.map((it) => `${it.quantity}x ${it.name}`).join(", ");
    
    // Alternate row colors for better readability
    const bgColor = idx % 2 === 0 ? "FFFFFF" : "F8FAFC";

    data.push([
      { v: inv.invoiceNumber, s: { ...dataStyle(bgColor), bold: true, color: "1E40AF" } },
      { v: format(new Date(inv.createdAt), "yyyy-MM-dd"), s: dataStyle(bgColor) },
      { v: inv.customerName || "Walk-in", s: dataStyle(bgColor) },
      { v: inv.customerPhone || "-", s: dataStyle(bgColor) },
      { v: itemsList, s: { ...dataStyle(bgColor), alignment: { horizontal: "left", vertical: "center", wrapText: true } } },
      { v: inv.discount > 0 ? inv.discount : "", s: numberStyle(bgColor) },
      { v: cost, s: numberStyle(bgColor) },
      { v: inv.total, s: numberStyle(bgColor) },
      { v: profit, s: { ...numberStyle(profitColor), color: profit >= 0 ? "047857" : "DC2626", bold: true } },
    ]);
  });

  // Empty row before totals
  data.push([
    { v: "", s: { border: { style: "thin", color: "E2E8F0" } } },
    { v: "", s: { border: { style: "thin", color: "E2E8F0" } } },
    { v: "", s: { border: { style: "thin", color: "E2E8F0" } } },
    { v: "", s: { border: { style: "thin", color: "E2E8F0" } } },
    { v: "", s: { border: { style: "thin", color: "E2E8F0" } } },
    { v: "", s: { border: { style: "thin", color: "E2E8F0" } } },
    { v: "", s: { border: { style: "thin", color: "E2E8F0" } } },
    { v: "", s: { border: { style: "thin", color: "E2E8F0" } } },
    { v: "", s: { border: { style: "thin", color: "E2E8F0" } } },
  ]);

  // Totals row
  data.push([
    { v: "TOTALS", s: footerStyle },
    { v: "", s: { ...footerStyle, border: { style: "none" } } },
    { v: `${invoices.length} Invoices`, s: { ...footerStyle, alignment: { horizontal: "left" } } },
    { v: "", s: { ...footerStyle, border: { style: "none" } } },
    { v: "", s: { ...footerStyle, border: { style: "none" } } },
    { v: totalDiscountSum > 0 ? totalDiscountSum : "", s: footerStyle },
    { v: totalCostSum, s: footerStyle },
    { v: totalSaleSum, s: footerStyle },
    { v: totalProfitSum, s: { ...footerStyle, color: totalProfitSum >= 0 ? "FFFFFF" : "FFFFFF" } },
  ]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Professional column widths
  ws["!cols"] = [
    { wch: 16 },  // Invoice #
    { wch: 13 },  // Date
    { wch: 20 },  // Customer
    { wch: 16 },  // Phone
    { wch: 45 },  // Products
    { wch: 13 },  // Discount
    { wch: 15 },  // Cost
    { wch: 15 },  // Sale
    { wch: 15 },  // Profit
  ];

  // Set row heights for better spacing
  ws["!rows"] = [
    { hpx: 24 }, // Title row
    { hpx: 8 },  // Spacer
    { hpx: 12 }, // Metadata
    { hpx: 8 },  // Spacer
    { hpx: 28 }, // Header row - larger
    ...Array(parsed.length).fill({ hpx: 24 }), // Data rows
    { hpx: 8 },  // Spacer
    { hpx: 30 }, // Totals - larger
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
  XLSX.writeFile(wb, `${filename}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

export function exportToCSV(invoices: Invoice[], filename: string = "invoices") {
  const parsed = invoices.map(parseInvoice);
  
  let totalCostSum = 0;
  let totalSaleSum = 0;
  let totalProfitSum = 0;
  let totalDiscountSum = 0;

  const data: any[] = [];

  // Add title and metadata
  data.push(["SALES INVOICE REPORT"]);
  data.push([`Generated: ${format(new Date(), "MMMM dd, yyyy - HH:mm")}`]);
  data.push([]);

  // Headers with better spacing
  data.push([
    "Invoice #",
    "Date",
    "Customer",
    "Phone",
    "Products",
    "Discount (Rs)",
    "Cost (Rs)",
    "Sale (Rs)",
    "Profit (Rs)",
  ]);

  parsed.forEach((inv) => {
    const cost = calculateCost(inv);
    const profit = calculateProfit(inv);
    totalCostSum += cost;
    totalSaleSum += inv.total;
    totalProfitSum += profit;
    totalDiscountSum += inv.discount;

    const itemsList = inv.parsedItems.map((it) => `${it.quantity}x ${it.name}`).join("; ");

    data.push([
      inv.invoiceNumber,
      format(new Date(inv.createdAt), "yyyy-MM-dd"),
      inv.customerName || "Walk-in",
      inv.customerPhone || "-",
      itemsList,
      inv.discount > 0 ? inv.discount : "",
      cost,
      inv.total,
      profit,
    ]);
  });

  // Separator
  data.push([]);
  
  // Totals row
  data.push([
    "TOTALS",
    "",
    `${invoices.length} Invoices`,
    "",
    "",
    totalDiscountSum > 0 ? totalDiscountSum : "",
    totalCostSum,
    totalSaleSum,
    totalProfitSum,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths for CSV as well
  ws["!cols"] = [
    { wch: 16 },  // Invoice #
    { wch: 13 },  // Date
    { wch: 20 },  // Customer
    { wch: 16 },  // Phone
    { wch: 45 },  // Products
    { wch: 13 },  // Discount
    { wch: 15 },  // Cost
    { wch: 15 },  // Sale
    { wch: 15 },  // Profit
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
  XLSX.writeFile(wb, `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`);
}
