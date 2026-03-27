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
  if (Date.now() > payload.expiresAt) throw new Error("License expired");
  return payload;
}

function getLicensePath() {
  const appDataRoot = process.env.APPDATA || path.join(process.cwd(), "data");
  const appData = process.env.APP_DATA_PATH || path.join(appDataRoot, "InventoryManager");
  return path.join(appData, "license.json");
}

function writeLicense(token: string) {
  const target = getLicensePath();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify({ token }, null, 2));
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { token } = req.body as { token?: string };
    if (!token) throw new Error("No token provided");
    verifyToken(token.trim());
    writeLicense(token.trim());
    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
}
