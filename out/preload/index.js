"use strict";
const electron = require("electron");
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
const ptyApi = {
  create: (opts) => electron.ipcRenderer.invoke(PTY_CHANNELS.CREATE, opts),
  write: (id, data) => {
    electron.ipcRenderer.send(PTY_CHANNELS.WRITE, id, data);
  },
  resize: (id, cols, rows) => {
    electron.ipcRenderer.send(PTY_CHANNELS.RESIZE, id, cols, rows);
  },
  destroy: (id) => {
    electron.ipcRenderer.send(PTY_CHANNELS.DESTROY, id);
  },
  onData: (cb) => {
    const listener = (_event, id, data) => {
      cb(id, data);
    };
    electron.ipcRenderer.on(PTY_CHANNELS.DATA, listener);
    return () => electron.ipcRenderer.removeListener(PTY_CHANNELS.DATA, listener);
  },
  onExit: (cb) => {
    const listener = (_event, id, exitCode, signal) => {
      cb(id, exitCode, signal);
    };
    electron.ipcRenderer.on(PTY_CHANNELS.EXIT, listener);
    return () => electron.ipcRenderer.removeListener(PTY_CHANNELS.EXIT, listener);
  }
};
const fsApi = {
  readDir: (dirPath) => electron.ipcRenderer.invoke(FS_CHANNELS.READ_DIR, dirPath),
  stat: (filePath) => electron.ipcRenderer.invoke(FS_CHANNELS.STAT, filePath),
  rename: (oldPath, newPath) => electron.ipcRenderer.invoke(FS_CHANNELS.RENAME, oldPath, newPath),
  delete: (filePath) => electron.ipcRenderer.invoke(FS_CHANNELS.DELETE, filePath),
  watch: (dirPath) => {
    electron.ipcRenderer.send(FS_CHANNELS.WATCH, dirPath);
  },
  unwatch: (dirPath) => {
    electron.ipcRenderer.send(FS_CHANNELS.UNWATCH, dirPath);
  },
  onFsEvent: (cb) => {
    const listener = (_event, data) => {
      cb(data);
    };
    electron.ipcRenderer.on(FS_CHANNELS.FS_EVENT, listener);
    return () => electron.ipcRenderer.removeListener(FS_CHANNELS.FS_EVENT, listener);
  }
};
const windowApi = {
  minimize: () => electron.ipcRenderer.send("window:minimize"),
  maximize: () => electron.ipcRenderer.send("window:maximize"),
  close: () => electron.ipcRenderer.send("window:close")
};
electron.contextBridge.exposeInMainWorld("api", {
  pty: ptyApi,
  fs: fsApi,
  window: windowApi
});
