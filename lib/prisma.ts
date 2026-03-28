import { PrismaClient } from "@prisma/client";
import path from "path";
import { pathToFileURL } from "url";

// Ensure SQLite URL points to an absolute path (helps when Next runs from .next or packaged contexts)
const ensureDbUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url || url.startsWith("file:./") || url === "file:./prisma/dev.db") {
    const abs = path.join(process.cwd(), "prisma", "dev.db");
    // Use file URL to safely handle spaces
    process.env.DATABASE_URL = pathToFileURL(abs).toString();
  }
};
ensureDbUrl();

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
