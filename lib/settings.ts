import fs from "fs";
import path from "path";
import os from "os";

export type ShopSettings = {
  shopName: string;
  address: string;
  phone: string;
};

const defaultSettings: ShopSettings = {
  shopName: "My Shop",
  address: "123 Market Street",
  phone: "000-0000000",
};

export function getSettingsPath() {
  const defaultAppData =
    process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming", "InventoryManager");
  const appDataPath = process.env.APP_DATA_PATH || defaultAppData;
  return path.join(appDataPath, "settings.json");
}

export function readSettings(): ShopSettings {
  const filePath = getSettingsPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultSettings, null, 2));
    return defaultSettings;
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return { ...defaultSettings, ...JSON.parse(content) };
  } catch {
    return defaultSettings;
  }
}

export function writeSettings(payload: ShopSettings) {
  const filePath = getSettingsPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return payload;
}
