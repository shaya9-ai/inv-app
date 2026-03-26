import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
      return res.status(200).json(products);
    }
    if (req.method === "POST") {
      const data = req.body;
      const product = await prisma.product.create({
        data: {
          name: data.name,
          category: data.category,
          unit: data.unit,
          buyPrice: Number(data.buyPrice),
          sellPrice: Number(data.sellPrice),
          currentStock: Number(data.currentStock ?? 0),
        },
      });
      return res.status(201).json(product);
    }
    if (req.method === "PUT") {
      const data = req.body;
      const product = await prisma.product.update({
        where: { id: Number(data.id) },
        data: {
          name: data.name,
          category: data.category,
          unit: data.unit,
          buyPrice: Number(data.buyPrice),
          sellPrice: Number(data.sellPrice),
          currentStock: Number(data.currentStock ?? 0),
        },
      });
      return res.status(200).json(product);
    }
    if (req.method === "DELETE") {
      const id = Number(req.query.id);
      await prisma.product.delete({ where: { id } });
      return res.status(204).end();
    }
    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).end();
  } catch (error) {
    console.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return res
        .status(400)
        .json({ error: "Cannot delete: product is linked to stock movements. Delete movements first." });
    }
    return res.status(500).json({ error: "Server error" });
  }
}
