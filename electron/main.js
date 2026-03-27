const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");
const Module = require("module");
const next = require("next");

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
    const packagedPath = path.join(process.resourcesPath, "resources", "prisma-client", `${relativeFile}.js`);
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
  // Convert a path to the SQLite-friendly URI format Prisma expects on Windows
  const resolved = path.resolve(filePath).replace(/\\/g, "/");
  return `file:${resolved}`;
}

async function prepareRuntimeFiles() {
  const userDataPath = app.getPath("userData");
  await fs.promises.mkdir(userDataPath, { recursive: true });

  const packagedDbPath = path.join(process.resourcesPath, "resources", "dev.db");
  const devDbPath = path.join(__dirname, "..", "prisma", "dev.db");
  const sourceDbPath = app.isPackaged ? packagedDbPath : devDbPath;
  const runtimeDbPath = path.join(userDataPath, "dev.db");

  if (!fs.existsSync(runtimeDbPath) && fs.existsSync(sourceDbPath)) {
    await fs.promises.copyFile(sourceDbPath, runtimeDbPath);
  }

  process.env.DATABASE_URL = toFileUrl(runtimeDbPath);
  process.env.APP_DATA_PATH = userDataPath;
}

async function createWindow() {
  await prepareRuntimeFiles();
  const nextApp = next({ dev: isDev, dir: path.join(__dirname, "..") });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  server = http.createServer(async (req, res) => {
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
    webPreferences: { nodeIntegration: false },
    backgroundColor: "#0b0b10",
    // Use default OS frame so minimize/restore/close buttons remain visible
    frame: true,
  });

  await win.loadURL(`http://localhost:${port}`);
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
