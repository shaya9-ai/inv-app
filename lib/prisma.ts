import { PrismaClient } from "@prisma/client";
import path from "path";
import { pathToFileURL } from "url";
import os from "os";

// Ensure SQLite URL points to an absolute path (helps when Next runs from .next or packaged contexts)
const ensureDbUrl = () => {
  const url = process.env.DATABASE_URL;
  const isDev = process.env.NODE_ENV === "development";
  
  if (isDev) console.log("[prisma.ts] DATABASE_URL at startup:", url?.slice(0, 50) + "...");
  
  // If URL is valid file:// or file:/// format, trust it (Electron sets this)
  if (url && (url.startsWith("file://") || url.startsWith("file:///"))) {
    if (isDev) console.log("[prisma.ts] Using Electron-provided DATABASE_URL");
    return;
  }
  
  // If URL is missing or uses relative path, convert to absolute
  if (!url || url.startsWith("file:./")) {
    let dbPath: string;
    
    // In production (Electron), use user's app data directory
    if (!isDev && process.platform === "win32") {
      const userDataPath = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
      const appDataFolder = path.join(userDataPath, "SPrintInventory");
      
      // Create folder if it doesn't exist (will work after build)
      try {
        if (typeof require !== "undefined") {
          const fs = require("fs");
          if (!fs.existsSync(appDataFolder)) {
            fs.mkdirSync(appDataFolder, { recursive: true });
          }
        }
      } catch (e) {
        // Ignore errors, use cwd fallback
      }
      
      dbPath = path.join(appDataFolder, "dev.db");
    } else {
      // Development or other platforms
      dbPath = path.join(process.cwd(), "prisma", "dev.db");
    }
    
    process.env.DATABASE_URL = pathToFileURL(dbPath).toString();
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
