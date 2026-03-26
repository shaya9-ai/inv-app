import AppShell from "../../components/app-shell";
import { prisma } from "../../lib/prisma";
import MovementsTable from "./table";

export const dynamic = "force-dynamic";

export default async function MovementsPage() {
  const movements = await prisma.stockMovement.findMany({
    orderBy: { date: "desc" },
    include: { product: true },
  });
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  return (
    <AppShell title="Stock Movements">
      <MovementsTable movements={movements} products={products} />
    </AppShell>
  );
}
