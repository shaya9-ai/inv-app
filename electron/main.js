const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { dialog } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");
const os = require("os");
const { pathToFileURL } = require("url");
const Module = require("module");
const next = require("next");
const crypto = require("crypto");

// Some environments (RDP/virtual GPUs) throw transient GPU command buffer errors; disable hardware acceleration to avoid crash.
app.disableHardwareAcceleration();

const isDev = !app.isPackaged;
const port = process.env.PORT || 8124;
let server;

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (request.startsWith("@prisma/client/runtime/")) {
    const runtimeFile = request.replace("@prisma/client/runtime/", "");
    const runtimePath = path.join(
      __dirname,
      "..",
      "node_modules",
      "@prisma",
      "client",
      "runtime",
      runtimeFile
    );
    if (fs.existsSync(runtimePath)) {
      return runtimePath;
    }
    if (fs.existsSync(`${runtimePath}.js`)) {
      return `${runtimePath}.js`;
    }
  }

  if (request.startsWith(".prisma/client/")) {
    const relativeFile = request.replace(".prisma/client/", "");
    const devPath = path.join(__dirname, "..", "node_modules", ".prisma", "client", `${relativeFile}.js`);
    const packagedPath = path.join(process.resourcesPath, "prisma-client", `${relativeFile}.js`);
    const resolvedPath = app.isPackaged ? packagedPath : devPath;
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }

  const rewrittenRequest = request.startsWith("@prisma/client-")
    ? "@prisma/client"
    : request;
  return originalResolveFilename.call(this, rewrittenRequest, parent, isMain, options);
};

function toFileUrl(filePath) {
  // Prisma sqlite accepts file:C:/path style; avoid triple-slash URLs
  const resolved = path.resolve(filePath).replace(/\\/g, "/");
  return `file:${resolved}`;
}

function getAppDataDir() {
  return process.env.APP_DATA_PATH || path.join(app.getPath("appData"), "InventoryManager");
}

function readPublicKey() {
  // In dev we read from repo; in production the file is copied alongside app.asar
  const devPath = path.join(__dirname, "..", "license", "public.pem");
  const prodPath = path.join(process.resourcesPath, "license", "public.pem");
  const asarSibling = path.join(process.resourcesPath, "public.pem");
  const pubPath = [prodPath, asarSibling, devPath].find((p) => fs.existsSync(p));
  if (!pubPath) throw new Error("public.pem missing");
  return fs.readFileSync(pubPath, "utf-8");
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function parseJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  return { header: parts[0], payload, signature: parts[2], signingInput: parts[0] + "." + parts[1] };
}

function verifyToken(token) {
  const { header, payload, signature, signingInput } = parseJwt(token);
  const decodedHeader = JSON.parse(Buffer.from(header.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  if (decodedHeader.alg !== "RS256") throw new Error("Unsupported alg");
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(signingInput);
  verifier.end();
  const ok = verifier.verify(readPublicKey(), Buffer.from(signature.replace(/-/g, "+").replace(/_/g, "/"), "base64"));
  if (!ok) throw new Error("Bad signature");
  if (!payload.expiresAt) throw new Error("Missing expiry");
  if (Date.now() > payload.expiresAt) throw new Error("License expired");
  return payload;
}

function loadLicenseFromDisk() {
  const target = path.join(getAppDataDir(), "license.json");
  if (!fs.existsSync(target)) return null;
  try {
    const stored = JSON.parse(fs.readFileSync(target, "utf-8"));
    if (stored && stored.token) return stored.token;
  } catch {}
  return null;
}

function saveLicense(token) {
  const dir = getAppDataDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "license.json"), JSON.stringify({ token }, null, 2));
}

async function ensureLicense(splash) {
  const setStatus = (msg) => {
    if (!splash || splash.isDestroyed()) return;
    splash.webContents.executeJavaScript(`window.setStatus && window.setStatus(${JSON.stringify(msg)})`).catch(() => {});
  };

  const tryToken = (token) => {
    const payload = verifyToken(token);
    return payload;
  };

  // try existing token
  const existing = loadLicenseFromDisk();
  if (existing) {
    try {
      setStatus("Validating saved license...");
      return tryToken(existing);
    } catch (e) {
      console.warn("Stored license invalid:", e.message);
    }
  }

  async function pickAndValidate() {
    setStatus("Activation needed: select your license file");
    const res = dialog.showOpenDialogSync({
      title: "Select License File",
      filters: [{ name: "License", extensions: ["lic", "txt", "json"] }, { name: "All Files", extensions: ["*"] }],
      properties: ["openFile"],
    });
    if (!res || res.length === 0) {
      return null;
    }
    const token = fs.readFileSync(res[0], "utf-8").trim();
    setStatus("Validating license...");
    const payload = tryToken(token);
    saveLicense(token);
    setStatus("License accepted. Launching...");
    return payload;
  }

  ipcMain.handle("browse-license", async () => {
    try {
      const payload = await pickAndValidate();
      return { ok: true, payload };
    } catch (e) {
      setStatus("License invalid, try again");
      return { ok: false, error: e.message };
    }
  });

  // prompt user to pick a license file (JWT text)
  for (;;) {
    try {
      const payload = await pickAndValidate();
      if (payload) return payload;
      // user cancelled; fall through to quit
      const exit = dialog.showMessageBoxSync({
        type: "warning",
        buttons: ["Browse Again", "Exit"],
        defaultId: 0,
        message: "License required",
        detail: "Select a license file to continue.",
      });
      if (exit === 1) {
        app.quit();
        return null;
      }
    } catch (e) {
      dialog.showMessageBoxSync({
        type: "error",
        message: "License invalid",
        detail: e.message,
      });
    }
  }
}

async function prepareRuntimeFiles() {
  const userDataPath = app.getPath("userData");
  await fs.promises.mkdir(userDataPath, { recursive: true });

  const packagedDbPath = path.join(process.resourcesPath, "dev.db");
  const devDbPath = path.join(__dirname, "..", "prisma", "dev.db");
  const sourceDbPath = app.isPackaged ? packagedDbPath : devDbPath;
  const runtimeDbPath = path.join(userDataPath, "dev.db");

  try {
    console.log("[prepareRuntimeFiles] app.isPackaged:", app.isPackaged);
    console.log("[prepareRuntimeFiles] sourceDbPath:", sourceDbPath);
    console.log("[prepareRuntimeFiles] sourceDbPath exists:", fs.existsSync(sourceDbPath));
    console.log("[prepareRuntimeFiles] runtimeDbPath:", runtimeDbPath);
    console.log("[prepareRuntimeFiles] runtimeDbPath exists:", fs.existsSync(runtimeDbPath));
    
    if (!fs.existsSync(runtimeDbPath)) {
      if (fs.existsSync(sourceDbPath)) {
        console.log("[prepareRuntimeFiles] Copying database from", sourceDbPath, "to", runtimeDbPath);
        await fs.promises.copyFile(sourceDbPath, runtimeDbPath);
        const stats = await fs.promises.stat(runtimeDbPath);
        console.log("[prepareRuntimeFiles] Database copied successfully, size:", stats.size, "bytes");
      } else {
        console.warn("[prepareRuntimeFiles] Source database not found at", sourceDbPath);
        console.warn("[prepareRuntimeFiles] Creating new database file (schema will need to be initialized)");
        await fs.promises.writeFile(runtimeDbPath, "");
      }
    } else {
      console.log("[prepareRuntimeFiles] Using existing runtime database at", runtimeDbPath);
    }

    // Ensure writable in user data (copied files can inherit read-only from Program Files)
    try {
      await fs.promises.chmod(runtimeDbPath, 0o666);
    } catch (chmodErr) {
      console.warn("[prepareRuntimeFiles] chmod failed (non-fatal):", chmodErr.message);
    }
  } catch (err) {
    console.error("[prepareRuntimeFiles] Error preparing database:", err);
  }

  const dbUrl = toFileUrl(runtimeDbPath);
  console.log("[prepareRuntimeFiles] DATABASE_URL:", dbUrl);
  process.env.DATABASE_URL = dbUrl;
  process.env.APP_DATA_PATH = userDataPath;
}

async function createWindow() {
  // Simple splash screen while Next/Electron get ready
  const splash = new BrowserWindow({
    width: 420,
    height: 260,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  splash.loadFile(path.join(__dirname, "..", "public", "splash.html")).catch(() => {});
  splash.on("unresponsive", () => splash.destroy());

  const license = await ensureLicense(splash);
  if (!license) return;

  await prepareRuntimeFiles();
  const nextApp = next({ dev: isDev, dir: path.join(__dirname, "..") });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  server = http.createServer(async (req, res) => {
    // lightweight bridge to open content in the default browser from the renderer
    if (req.url && req.url.startsWith("/open-external")) {
      // GET: expects ?url=... (data:, http/https)
      if (req.method === "GET" && req.url.startsWith("/open-external?url=")) {
        const target = decodeURIComponent(req.url.slice("/open-external?url=".length));
        try {
          if (!/^data:text\/html[,;]/i.test(target) && !/^https?:\/\//i.test(target)) {
            res.statusCode = 400;
            res.end("invalid url");
            return;
          }
          await shell.openExternal(target);
          res.statusCode = 200;
          res.end("ok");
        } catch {
          res.statusCode = 500;
          res.end("fail");
        }
        return;
      }
      // POST: body contains HTML; write to temp file and open file://
      if (req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
          try {
            if (!body) throw new Error("empty");
            const tmpPath = path.join(os.tmpdir(), `invoice-${Date.now()}.html`);
            await fs.promises.writeFile(tmpPath, body, "utf-8");
            await shell.openExternal(`file://${tmpPath}`);
            res.statusCode = 200;
            res.end("ok");
          } catch {
            res.statusCode = 500;
            res.end("fail");
          }
        });
        return;
      }
      res.statusCode = 405;
      res.end("method");
      return;
    }

    try {
      await handle(req, res);
    } catch (error) {
      console.error("Next request failed:", req.url, error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => resolve());
  });

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    icon: path.join(__dirname, "..", "app", "favicon.ico"),
    webPreferences: { nodeIntegration: false },
    backgroundColor: "#0b0b10",
    // Use default OS frame so minimize/restore/close buttons remain visible
    frame: true,
  });

  await win.loadURL(`http://localhost:${port}`);

  // Show main window as soon as it's ready; hard fallback after 8s in case build is slow
  win.once("ready-to-show", () => {
    splash?.destroy();
    win.show();
  });
  setTimeout(() => {
    if (!win.isVisible()) {
      splash?.destroy();
      win.show();
    }
  }, 8000);
}

app.whenReady().then(createWindow);

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});
app.on("window-all-closed", () => {
  if (server) server.close();
  if (process.platform !== "darwin") app.quit();
});
