import AppShell from "../../components/app-shell";
import { prisma } from "../../lib/prisma";
import ReceiptsTable from "./table";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  const movements = await prisma.stockMovement.findMany({
    where: { type: "CHECK_IN" },
    orderBy: { date: "desc" },
    include: { product: true },
  });

  return (
    <AppShell title="Receipts">
      <ReceiptsTable movements={movements} />
    </AppShell>
  );
}
