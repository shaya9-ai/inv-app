import AppShell from "../../../components/app-shell";
import { prisma } from "../../../lib/prisma";
import NewInvoice from "./ui";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return (
    <AppShell title="New Invoice">
      <NewInvoice products={products} />
    </AppShell>
  );
}
