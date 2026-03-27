import fs from "fs";
import path from "path";

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
<<<<<<< HEAD
  const appDataPath = process.env.APP_DATA_PATH || process.cwd();
  return path.join(appDataPath, "settings.json");
=======
  return path.join(process.cwd(), "settings.json");
>>>>>>> b7c7ea63851aefeb00e32bf037964ec6794c2e19
}

export function readSettings(): ShopSettings {
  const filePath = getSettingsPath();
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
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return payload;
}
