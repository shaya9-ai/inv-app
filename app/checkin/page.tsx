import AppShell from "../../components/app-shell";
import { prisma } from "../../lib/prisma";
import CheckinGrid from "./checkin-grid";

export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return (
    <AppShell title="Check-in">
      <CheckinGrid products={products} />
    </AppShell>
  );
}
