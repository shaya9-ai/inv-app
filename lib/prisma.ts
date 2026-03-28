import { PrismaClient } from "@prisma/client";
import path from "path";
import { pathToFileURL } from "url";

// Ensure SQLite URL points to an absolute path (helps when Next runs from .next or packaged contexts)
const ensureDbUrl = () => {
  const url = process.env.DATABASE_URL;
  const isDev = process.env.NODE_ENV === "development";
  
  if (isDev) console.log("[prisma.ts] DATABASE_URL at startup:", url?.slice(0, 50) + "...");
  
  // If URL is valid file:// or file:/// format, trust it (Electron sets this)
  if (url && (url.startsWith("file://") || url.startsWith("file:///"))) {
    if (isDev) console.log("[prisma.ts] Using Electron-provided DATABASE_URL");
    return; // URL is already valid, don't override
  }
  
  // If URL is missing or uses relative path, convert to absolute
  if (!url || url.startsWith("file:./")) {
    const abs = path.join(process.cwd(), "prisma", "dev.db");
    process.env.DATABASE_URL = pathToFileURL(abs).toString();
    if (isDev) console.log("[prisma.ts] Set DATABASE_URL to:", process.env.DATABASE_URL?.slice(0, 50) + "...");
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
