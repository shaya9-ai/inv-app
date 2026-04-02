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
        const invoiceItems = [];
        
        for (const item of items) {
          const productId = item.id ?? item.productId;
          const product = await tx.product.findUnique({ where: { id: productId } });
          
          if (!product) {
            throw new Error(`Product not found: ${item.name}`);
          }
          
          if (product.currentStock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }
          
          await tx.product.update({
            where: { id: productId },
            data: { currentStock: { decrement: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: productId,
              type: "CHECK_OUT",
              quantity: item.quantity,
              buyPrice: product.buyPrice,
              note: "Invoice checkout",
            },
          });
          
          invoiceItems.push({
            productId: productId,
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            price: item.price,
            buyPrice: product.buyPrice,
          });
        }
        
        const newInvoice = await tx.invoice.create({
          data: {
            invoiceNumber: "INV-" + new Date().toLocaleDateString("en-GB").replace(/\//g, "").slice(0, 6) + Math.floor(Math.random() * 90 + 10),
            customerName,
            customerPhone: customerPhone ?? "",
            items: JSON.stringify(invoiceItems),
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
      
      const existingInvoice = await prisma.invoice.findUnique({ where: { id: Number(id) } });
      if (!existingInvoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const oldItems = JSON.parse(existingInvoice.items || "[]") as { productId: number; quantity: number; buyPrice?: number }[];
      const newItems = items as { id?: number; productId: number; name?: string; unit?: string; quantity: number; price?: number }[];

      const invoice = await prisma.$transaction(async (tx) => {
        for (const oldItem of oldItems) {
          const oldProduct = await tx.product.findUnique({ where: { id: oldItem.productId } });
          await tx.product.update({
            where: { id: oldItem.productId },
            data: { currentStock: { increment: oldItem.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: oldItem.productId,
              type: "CHECK_IN",
              quantity: oldItem.quantity,
              buyPrice: oldProduct?.buyPrice ?? 0,
              note: "Invoice edit - stock restored",
            },
          });
        }

        const updatedInvoiceItems = [];
        for (const newItem of newItems) {
          const prodId = (newItem.productId || newItem.id) as number;
          const product = await tx.product.findUnique({ where: { id: prodId } });
          if (product && product.currentStock < newItem.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }
          await tx.product.update({
            where: { id: prodId },
            data: { currentStock: { decrement: newItem.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: prodId,
              type: "CHECK_OUT",
              quantity: newItem.quantity,
              buyPrice: product?.buyPrice ?? 0,
              note: "Invoice edit - new checkout",
            },
          });
          
          updatedInvoiceItems.push({
            productId: prodId,
            name: newItem.name || product?.name || "",
            unit: newItem.unit,
            quantity: newItem.quantity,
            price: newItem.price,
            buyPrice: product?.buyPrice ?? 0,
          });
        }

        return await tx.invoice.update({
          where: { id: Number(id) },
          data: {
            customerName,
            customerPhone: customerPhone ?? "",
            items: JSON.stringify(updatedInvoiceItems),
            subtotal,
            discount: Number(discount ?? 0),
            discountType,
            total,
          },
        });
      });
      return res.status(200).json(invoice);
    }

    if (req.method === "DELETE") {
      try {
        const id = Number(req.query.id);
        
        if (isNaN(id) || id <= 0) {
          return res.status(400).json({ error: "Invalid invoice ID" });
        }
        
        const existingInvoice = await prisma.invoice.findUnique({ where: { id } });
        if (!existingInvoice) {
          return res.status(404).json({ error: "Invoice not found" });
        }

        let items: { productId: number; quantity: number; buyPrice?: number }[] = [];
        try {
          items = JSON.parse(existingInvoice.items || "[]");
        } catch {
          items = [];
        }

        // Delete invoice first, then restore stock
        await prisma.$transaction(async (tx) => {
          // Delete invoice first
          await tx.invoice.delete({ where: { id } });
          
          // Then restore stock for each item
          for (const item of items) {
            try {
              // Check if product exists
              const product = await tx.product.findUnique({ where: { id: item.productId } });
              if (product) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: { currentStock: { increment: item.quantity } },
                });
              }
              // Create stock movement record
              await tx.stockMovement.create({
                data: {
                  productId: item.productId,
                  type: "CHECK_IN",
                  quantity: item.quantity,
                  buyPrice: item.buyPrice ?? 0,
                  note: "Invoice deleted - stock restored",
                },
              });
            } catch (itemErr) {
              console.error("Error restoring stock for item:", itemErr);
              // Continue with other items
            }
          }
        });
        
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error("Delete invoice error:", error);
        return res.status(500).json({ error: "Failed to delete invoice" });
      }
    }

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}
