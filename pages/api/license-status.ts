import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import crypto from "crypto";

function base64urlDecode(str: string) {
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function parseJwt(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  return {
    header: JSON.parse(base64urlDecode(parts[0])),
    payload: JSON.parse(base64urlDecode(parts[1])),
    signature: parts[2],
    signingInput: parts[0] + "." + parts[1],
  };
}

function readPublicKey() {
  const pubPath = path.join(process.cwd(), "license", "public.pem");
  return fs.readFileSync(pubPath, "utf-8");
}

function verifyToken(token: string) {
  const { header, payload, signature, signingInput } = parseJwt(token);
  if (header.alg !== "RS256") throw new Error("Unsupported alg");
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(signingInput);
  verifier.end();
  const ok = verifier.verify(readPublicKey(), Buffer.from(signature.replace(/-/g, "+").replace(/_/g, "/"), "base64"));
  if (!ok) throw new Error("Bad signature");
  if (!payload.expiresAt) throw new Error("Missing expiry");
  return payload;
}

function getLicensePathCandidates() {
  const appDataRoot = process.env.APPDATA || path.join(process.cwd(), "data");
  const appData = process.env.APP_DATA_PATH || path.join(appDataRoot, "InventoryManager");
  return [
    path.join(appData, "license.json"),
    path.join(appDataRoot, "license.json"), // legacy location from older builds
  ];
}

function loadLicenseToken() {
  const candidates = getLicensePathCandidates();
  let lastError: string | null = null;
  for (const target of candidates) {
    if (!fs.existsSync(target)) continue;
    try {
      const json = JSON.parse(fs.readFileSync(target, "utf-8"));
      if (json.token) return json.token as string;
    } catch (e: any) {
      lastError = e.message;
    }
  }
  throw new Error(lastError || "No license file");
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = loadLicenseToken();
    const payload = verifyToken(token);
    const now = Date.now();
    const remainingMs = payload.expiresAt - now;
    res.status(200).json({
      valid: remainingMs > 0,
      expiresAt: payload.expiresAt,
      daysLeft: Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24))),
    });
  } catch (e: any) {
    res.status(200).json({ valid: false, error: e.message });
  }
}
