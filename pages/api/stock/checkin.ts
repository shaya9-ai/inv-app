import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import { format } from "date-fns";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { items, supplierName, note, discount = 0, discountType = "AMOUNT" } = req.body as {
      items: { productId: number; quantity: number; price: number }[];
      supplierName?: string;
      note?: string;
      discount?: number;
      discountType?: "AMOUNT" | "PERCENT";
    };
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items required" });
    }
    const receiptItems: any[] = [];
    const movements = [];
    for (const item of items) {
      const product = await prisma.product.update({
        where: { id: Number(item.productId) },
        data: { currentStock: { increment: Number(item.quantity) } },
      });
      const movement = await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: "CHECK_IN",
          quantity: Number(item.quantity),
          buyPrice: item.price ? Number(item.price) : null,
          supplierName: supplierName || null,
          note: note || null,
        },
      });
      movements.push(movement);
      receiptItems.push({
        name: product.name,
        unit: product.unit,
        quantity: movement.quantity,
        price: movement.buyPrice ?? 0,
      });
    }

    const subtotal = receiptItems.reduce((sum, i) => sum + i.quantity * i.price, 0);
    const discountValue =
      discountType === "PERCENT" ? (subtotal * Number(discount ?? 0)) / 100 : Number(discount ?? 0);
    const total = Math.max(subtotal - discountValue, 0);
    const receipt = {
      receiptNumber: `GRN-${movements[0].id}`,
      date: format(new Date(), "PPpp"),
      supplierName: supplierName || "",
      items: receiptItems,
      subtotal,
      discount: Number(discount ?? 0),
      discountType,
      total,
    };
    return res.status(200).json({ movements, receipt });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}
