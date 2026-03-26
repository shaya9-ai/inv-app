import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/prisma";
import { calculateTotals } from "../../server/totals";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" } });
      return res.status(200).json(invoices);
    }

    if (req.method === "POST") {
      const { items, customerName, customerPhone, discount, discountType } = req.body;
      const { subtotal, total } = calculateTotals(items, Number(discount), discountType as "AMOUNT" | "PERCENT");

      const ids = items.map((it: any) => it.id ?? it.productId);
      const products = await prisma.product.findMany({ where: { id: { in: ids } } });
      for (const item of items) {
        const product = products.find((p) => p.id === (item.id ?? item.productId));
        if (!product) {
          return res.status(400).json({ error: `Product ${item.name ?? item.id} not found` });
        }
        if (product.currentStock < item.quantity) {
          return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
        }
      }

      const invoice = await prisma.$transaction(async (tx) => {
        for (const item of items) {
          await tx.product.update({
            where: { id: item.id ?? item.productId },
            data: { currentStock: { decrement: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.id ?? item.productId,
              type: "CHECK_OUT",
              quantity: item.quantity,
              buyPrice: item.price,
              note: "Invoice checkout",
            },
          });
        }
        const newInvoice = await tx.invoice.create({
          data: {
            invoiceNumber: "INV-" + Date.now(),
            customerName,
            customerPhone: customerPhone ?? "",
            items: JSON.stringify(
              items.map((it: any) => ({
                productId: it.id ?? it.productId,
                name: it.name,
                unit: it.unit,
                quantity: it.quantity,
                price: it.price,
              }))
            ),
            subtotal,
            discount: Number(discount ?? 0),
            discountType,
            total,
          },
        });
        return newInvoice;
      });
      return res.status(201).json({
        ...invoice,
        parsedItems: JSON.parse(invoice.items),
      });
    }

    if (req.method === "PUT") {
      const { id, items, customerName, customerPhone, discount, discountType } = req.body;
      const { subtotal, total } = calculateTotals(items, Number(discount), discountType as "AMOUNT" | "PERCENT");
      const invoice = await prisma.invoice.update({
        where: { id: Number(id) },
        data: {
          customerName,
          customerPhone: customerPhone ?? "",
          items: JSON.stringify(items),
          subtotal,
          discount: Number(discount ?? 0),
          discountType,
          total,
        },
      });
      return res.status(200).json(invoice);
    }

    if (req.method === "DELETE") {
      const id = Number(req.query.id);
      await prisma.invoice.delete({ where: { id } });
      return res.status(204).end();
    }

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}
