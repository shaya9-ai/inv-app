import AppShell from "../../components/app-shell";
import { prisma } from "../../lib/prisma";
import InvoiceList from "./table";

export const dynamic = "force-dynamic";

export default async function InvoicePage() {
  const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" } });
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return (
    <AppShell title="Invoices">
      <InvoiceList invoices={invoices} products={products} />
    </AppShell>
  );
}
