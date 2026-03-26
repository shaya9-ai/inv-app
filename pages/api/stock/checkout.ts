import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { items } = req.body as { items: { productId: number; quantity: number; price: number }[] };
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items required" });
    }
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      });
      await prisma.stockMovement.create({
        data: {
          productId: item.productId,
          type: "CHECK_OUT",
          quantity: item.quantity,
          buyPrice: item.price,
          note: "Invoice checkout",
        },
      });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}
