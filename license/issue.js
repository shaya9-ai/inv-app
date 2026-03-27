#!/usr/bin/env node
// Simple offline license issuer (RSA)
// Usage (non-interactive):
//   node license/issue.js --days 30 --out customer.lic [--device DEVICEID]
// node license/issue.js
// If --days is omitted, it will prompt for days/device/output interactively.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function base64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sign(payload, privKey) {
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privKey);
  return `${encodedHeader}.${encodedPayload}.${base64url(signature)}`;
}

function parseArgs(argv) {
  const res = { days: null, out: "license.lic", device: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--days" && argv[i + 1]) res.days = Number(argv[++i]);
    else if (a === "--device" && argv[i + 1]) res.device = argv[++i];
    else if (a === "--out" && argv[i + 1]) res.out = argv[++i];
  }
  return res;
}

function ensurePrivKey() {
  const privPath = path.join(__dirname, "private.pem");
  if (!fs.existsSync(privPath)) {
    console.error("private.pem missing in license/ — cannot sign");
    process.exit(1);
  }
  return fs.readFileSync(privPath, "utf-8");
}

async function promptInteractive(args) {
  const rl = require("readline").createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, (ans) => res(ans.trim())));
  const daysAns = await ask("Days valid (default 30): ");
  const deviceAns = await ask("Device ID (optional, Enter to skip): ");
  const outAns = await ask("Output file (default license.lic): ");
  rl.close();
  args.days = daysAns ? Number(daysAns) : 30;
  args.device = deviceAns || null;
  args.out = outAns || "license.lic";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.days || args.days <= 0) {
    await promptInteractive(args);
  }
  if (!args.days || args.days <= 0) {
    console.error("Invalid days value.");
    process.exit(1);
  }

  const privKey = ensurePrivKey();
  const now = Date.now();
  const payload = {
    licenseId: crypto.randomBytes(8).toString("hex"),
    issuedAt: now,
    expiresAt: now + args.days * 24 * 60 * 60 * 1000,
  };
  if (args.device) payload.deviceId = args.device;

  const token = sign(payload, privKey);
  fs.writeFileSync(args.out, token);
  console.log(`License written to ${args.out}`);
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
