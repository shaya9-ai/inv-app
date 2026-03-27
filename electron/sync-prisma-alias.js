const fs = require("fs");
const path = require("path");

function copyDir(src, dest) {
  fs.cpSync(src, dest, { recursive: true, force: true });
}

function findPrismaHashes(projectRoot) {
  const chunksDir = path.join(projectRoot, ".next", "server", "chunks");
  const hashes = new Set();
  if (!fs.existsSync(chunksDir)) return hashes;

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.name.endsWith(".js")) continue;
      const content = fs.readFileSync(fullPath, "utf-8");
      const matches = content.matchAll(/@prisma\/client-([a-z0-9]+)/gi);
      for (const match of matches) {
        hashes.add(match[1]);
      }
    }
  };

  walk(chunksDir);
  return hashes;
}

function main() {
  const projectRoot = path.join(__dirname, "..");
  const sourceBase = path.join(projectRoot, ".next", "node_modules", "@prisma");
  const rootClientDir = path.join(projectRoot, "node_modules", "@prisma", "client");
  const targetBase = path.join(projectRoot, "node_modules", "@prisma");

  fs.mkdirSync(targetBase, { recursive: true });

  if (!fs.existsSync(rootClientDir)) {
    console.error("[prepare:electron-prisma] Missing source Prisma client:", rootClientDir);
    process.exit(1);
  }

  const hashes = findPrismaHashes(projectRoot);

  if (hashes.size === 0 && fs.existsSync(sourceBase)) {
    const entries = fs
      .readdirSync(sourceBase, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("client-"));
    for (const entry of entries) {
      const src = path.join(sourceBase, entry.name);
      const dest = path.join(targetBase, entry.name);
      copyDir(src, dest);
      console.log(`[prepare:electron-prisma] Synced ${entry.name} from .next alias`);
    }
    if (entries.length > 0) return;
  }

  if (hashes.size === 0) {
    console.warn("[prepare:electron-prisma] No Prisma hash found in chunks; nothing to sync.");
    return;
  }

  for (const hash of hashes) {
    const aliasName = `client-${hash}`;
    const dest = path.join(targetBase, aliasName);
    copyDir(rootClientDir, dest);
    console.log(`[prepare:electron-prisma] Created ${aliasName} alias from @prisma/client`);
  }
}

main();
