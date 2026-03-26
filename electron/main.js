const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");
const next = require("next");

const isDev = !app.isPackaged;
const port = process.env.PORT || 3000;
let server;

async function createWindow() {
  const nextApp = next({ dev: isDev, dir: path.join(__dirname, "..") });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  server = http.createServer((req, res) => handle(req, res));
  server.listen(port);

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: { nodeIntegration: false },
    backgroundColor: "#0b0b10",
    titleBarStyle: "hidden",
  });

  await win.loadURL(`http://localhost:${port}`);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (server) server.close();
  if (process.platform !== "darwin") app.quit();
});
