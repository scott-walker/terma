"use strict";
const electron = require("electron");
const path = require("path");
const pty = require("node-pty");
const promises = require("fs/promises");
const chokidar = require("chokidar");
const nanoid = require("nanoid");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const pty__namespace = /* @__PURE__ */ _interopNamespaceDefault(pty);
const PTY_CHANNELS = {
  CREATE: "pty:create",
  WRITE: "pty:write",
  RESIZE: "pty:resize",
  DESTROY: "pty:destroy",
  DATA: "pty:data",
  EXIT: "pty:exit"
};
const FS_CHANNELS = {
  READ_DIR: "fs:readDir",
  STAT: "fs:stat",
  RENAME: "fs:rename",
  DELETE: "fs:delete",
  WATCH: "fs:watch",
  UNWATCH: "fs:unwatch",
  FS_EVENT: "fs:event"
};
class PtyManager {
  sessions = /* @__PURE__ */ new Map();
  get shell() {
    return process.env.SHELL || "/bin/bash";
  }
  create(id, win, opts = {}) {
    const term = pty__namespace.spawn(this.shell, [], {
      name: "xterm-256color",
      cols: opts.cols || 80,
      rows: opts.rows || 24,
      cwd: opts.cwd || process.env.HOME || "/",
      env: process.env
    });
    this.sessions.set(id, term);
    term.onData((data) => {
      if (!win.isDestroyed()) {
        win.webContents.send(PTY_CHANNELS.DATA, id, data);
      }
    });
    term.onExit(({ exitCode, signal }) => {
      this.sessions.delete(id);
      if (!win.isDestroyed()) {
        win.webContents.send(PTY_CHANNELS.EXIT, id, exitCode, signal);
      }
    });
  }
  write(id, data) {
    this.sessions.get(id)?.write(data);
  }
  resize(id, cols, rows) {
    try {
      this.sessions.get(id)?.resize(cols, rows);
    } catch {
    }
  }
  destroy(id) {
    const term = this.sessions.get(id);
    if (term) {
      term.kill();
      this.sessions.delete(id);
    }
  }
  destroyAll() {
    for (const [id] of this.sessions) {
      this.destroy(id);
    }
  }
}
class FsService {
  async readDir(dirPath) {
    const entries = await promises.readdir(dirPath, { withFileTypes: true });
    const results = [];
    for (const entry of entries) {
      try {
        const fullPath = path.join(dirPath, entry.name);
        const stats = await promises.stat(fullPath);
        results.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          isSymlink: entry.isSymbolicLink(),
          size: stats.size,
          modified: stats.mtimeMs
        });
      } catch {
      }
    }
    results.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return results;
  }
  async stat(filePath) {
    const stats = await promises.stat(filePath);
    const name = filePath.split("/").pop() || filePath;
    return {
      name,
      path: filePath,
      isDirectory: stats.isDirectory(),
      isSymlink: stats.isSymbolicLink(),
      size: stats.size,
      modified: stats.mtimeMs
    };
  }
  async rename(oldPath, newPath) {
    await promises.rename(oldPath, newPath);
  }
  async delete(filePath) {
    await promises.rm(filePath, { recursive: true });
  }
}
class FsWatcher {
  watchers = /* @__PURE__ */ new Map();
  watch(dirPath, win) {
    if (this.watchers.has(dirPath)) return;
    const watcher = chokidar.watch(dirPath, {
      depth: 0,
      ignoreInitial: true,
      ignorePermissionErrors: true
    });
    watcher.on("all", (event, path2) => {
      if (!win.isDestroyed()) {
        win.webContents.send(FS_CHANNELS.FS_EVENT, { event, path: path2, dirPath });
      }
    });
    this.watchers.set(dirPath, watcher);
  }
  unwatch(dirPath) {
    const watcher = this.watchers.get(dirPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(dirPath);
    }
  }
  unwatchAll() {
    for (const [, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
  }
}
function registerIpcHandlers(ptyManager2, fsService2, fsWatcher2) {
  electron.ipcMain.handle(PTY_CHANNELS.CREATE, (event, opts) => {
    const id = nanoid.nanoid();
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    if (!win) throw new Error("No window found");
    ptyManager2.create(id, win, opts);
    return id;
  });
  electron.ipcMain.on(PTY_CHANNELS.WRITE, (_event, id, data) => {
    ptyManager2.write(id, data);
  });
  electron.ipcMain.on(PTY_CHANNELS.RESIZE, (_event, id, cols, rows) => {
    ptyManager2.resize(id, cols, rows);
  });
  electron.ipcMain.on(PTY_CHANNELS.DESTROY, (_event, id) => {
    ptyManager2.destroy(id);
  });
  electron.ipcMain.handle(FS_CHANNELS.READ_DIR, (_event, dirPath) => {
    return fsService2.readDir(dirPath);
  });
  electron.ipcMain.handle(FS_CHANNELS.STAT, (_event, filePath) => {
    return fsService2.stat(filePath);
  });
  electron.ipcMain.handle(FS_CHANNELS.RENAME, (_event, oldPath, newPath) => {
    return fsService2.rename(oldPath, newPath);
  });
  electron.ipcMain.handle(FS_CHANNELS.DELETE, (_event, filePath) => {
    return fsService2.delete(filePath);
  });
  electron.ipcMain.on(FS_CHANNELS.WATCH, (event, dirPath) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    if (win) fsWatcher2.watch(dirPath, win);
  });
  electron.ipcMain.on(FS_CHANNELS.UNWATCH, (_event, dirPath) => {
    fsWatcher2.unwatch(dirPath);
  });
}
electron.app.commandLine.appendSwitch("no-sandbox");
const ptyManager = new PtyManager();
const fsService = new FsService();
const fsWatcher = new FsWatcher();
function createWindow() {
  const win = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 300,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#1a1b26",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  if (process.env.NODE_ENV === "development" || process.env["ELECTRON_RENDERER_URL"]) {
    win.webContents.openDevTools({ mode: "bottom" });
  }
  return win;
}
electron.app.whenReady().then(() => {
  registerIpcHandlers(ptyManager, fsService, fsWatcher);
  electron.ipcMain.on("window:minimize", (event) => {
    electron.BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  electron.ipcMain.on("window:maximize", (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });
  electron.ipcMain.on("window:close", (event) => {
    electron.BrowserWindow.fromWebContents(event.sender)?.close();
  });
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  ptyManager.destroyAll();
  fsWatcher.unwatchAll();
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("before-quit", () => {
  ptyManager.destroyAll();
  fsWatcher.unwatchAll();
});
