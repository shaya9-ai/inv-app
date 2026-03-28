import * as XLSX from "xlsx";
import { Invoice } from "@prisma/client";
import { format } from "date-fns";

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

export function exportToExcel(invoices: Invoice[], filename: string = "invoices") {
  const parsed = invoices.map(parseInvoice);
  
  const data = parsed.map((inv) => {
    const itemsList = inv.parsedItems.map((it) => `${it.quantity}x ${it.name}`).join(", ");
    return {
      "Invoice #": inv.invoiceNumber,
      "Date": format(new Date(inv.createdAt), "yyyy-MM-dd HH:mm"),
      "Customer": inv.customerName || "Walk-in",
      "Phone": inv.customerPhone || "-",
      "Products": itemsList,
      "Subtotal": inv.subtotal,
      "Discount": inv.discount,
      "Total": inv.total,
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invoices");

  ws["!cols"] = [
    { wch: 15 },
    { wch: 18 },
    { wch: 20 },
    { wch: 15 },
    { wch: 50 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
  ];

  XLSX.writeFile(wb, `${filename}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

export function exportToCSV(invoices: Invoice[], filename: string = "invoices") {
  const parsed = invoices.map(parseInvoice);
  
  const data = parsed.map((inv) => {
    const itemsList = inv.parsedItems.map((it) => `${it.quantity}x ${it.name}`).join("; ");
    return {
      "Invoice #": inv.invoiceNumber,
      "Date": format(new Date(inv.createdAt), "yyyy-MM-dd HH:mm"),
      "Customer": inv.customerName || "Walk-in",
      "Phone": inv.customerPhone || "",
      "Products": itemsList,
      "Subtotal": inv.subtotal,
      "Discount": inv.discount,
      "Total": inv.total,
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invoices");
  XLSX.writeFile(wb, `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`);
}
