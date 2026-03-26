import AppShell from "../../components/app-shell";
import { prisma } from "../../lib/prisma";
import InventoryGrid from "./inventory-grid";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <AppShell title="Inventory">
      <div className="flex flex-col gap-4 pb-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Hover a product to add to invoice.</p>
          </div>
        </div>
        <InventoryGrid products={products} />
      </div>
    </AppShell>
  );
}
