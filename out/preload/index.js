"use strict";
const electron = require("electron");
const os = require("os");
const PTY_CHANNELS = {
  CREATE: "pty:create",
  WRITE: "pty:write",
  RESIZE: "pty:resize",
  DESTROY: "pty:destroy",
  DATA: "pty:data",
  EXIT: "pty:exit",
  GET_CWD: "pty:getCwd"
};
const FS_CHANNELS = {
  READ_DIR: "fs:readDir",
  STAT: "fs:stat",
  RENAME: "fs:rename",
  DELETE: "fs:delete",
  RESTORE: "fs:restore",
  COPY: "fs:copy",
  COPY_PROGRESS: "fs:copyProgress",
  WATCH: "fs:watch",
  UNWATCH: "fs:unwatch",
  FS_EVENT: "fs:event"
};
const SETTINGS_CHANNELS = {
  GET: "settings:get",
  UPDATE: "settings:update",
  RESET: "settings:reset",
  CHANGED: "settings:changed"
};
const SESSION_CHANNELS = {
  SAVE: "session:save",
  LOAD: "session:load"
};
const SHELL_CHANNELS = {
  OPEN_PATH: "shell:openPath",
  OPEN_WITH: "shell:openWith"
};
const CLIPBOARD_CHANNELS = {
  READ_FILE_PATHS: "clipboard:readFilePaths",
  SAVE_IMAGE: "clipboard:saveImage"
};
const WHISPER_CHANNELS = {
  TRANSCRIBE: "whisper:transcribe"
};
const WINDOW_CHANNELS = {
  MINIMIZE: "window:minimize",
  MAXIMIZE: "window:maximize",
  CLOSE: "window:close",
  IS_MAXIMIZED: "window:isMaximized",
  MAXIMIZED_CHANGE: "window:maximized-change"
};
const LOG_CHANNELS = {
  GET_LOGS: "log:getLogs",
  ON_LOG: "log:onLog"
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
  getCwd: (id) => electron.ipcRenderer.invoke(PTY_CHANNELS.GET_CWD, id),
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
  restore: (originalPaths) => electron.ipcRenderer.invoke(FS_CHANNELS.RESTORE, originalPaths),
  copy: (srcPath, destDir) => electron.ipcRenderer.invoke(FS_CHANNELS.COPY, srcPath, destDir),
  onCopyProgress: (cb) => {
    const listener = (_event, progress) => {
      cb(progress);
    };
    electron.ipcRenderer.on(FS_CHANNELS.COPY_PROGRESS, listener);
    return () => electron.ipcRenderer.removeListener(FS_CHANNELS.COPY_PROGRESS, listener);
  },
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
const settingsApi = {
  get: () => electron.ipcRenderer.invoke(SETTINGS_CHANNELS.GET),
  update: (partial) => electron.ipcRenderer.invoke(SETTINGS_CHANNELS.UPDATE, partial),
  reset: () => electron.ipcRenderer.invoke(SETTINGS_CHANNELS.RESET),
  onChanged: (cb) => {
    const listener = (_event, settings) => {
      cb(settings);
    };
    electron.ipcRenderer.on(SETTINGS_CHANNELS.CHANGED, listener);
    return () => electron.ipcRenderer.removeListener(SETTINGS_CHANNELS.CHANGED, listener);
  }
};
const sessionApi = {
  save: (state) => electron.ipcRenderer.invoke(SESSION_CHANNELS.SAVE, state),
  load: () => electron.ipcRenderer.invoke(SESSION_CHANNELS.LOAD)
};
const shellApi = {
  openPath: (path) => electron.ipcRenderer.invoke(SHELL_CHANNELS.OPEN_PATH, path),
  openWith: (command, filePath) => electron.ipcRenderer.invoke(SHELL_CHANNELS.OPEN_WITH, command, filePath),
  homePath: os.homedir()
};
const clipboardApi = {
  readFilePaths: () => electron.ipcRenderer.invoke(CLIPBOARD_CHANNELS.READ_FILE_PATHS),
  saveImage: (destDir) => electron.ipcRenderer.invoke(CLIPBOARD_CHANNELS.SAVE_IMAGE, destDir)
};
const windowApi = {
  minimize: () => electron.ipcRenderer.send(WINDOW_CHANNELS.MINIMIZE),
  maximize: () => electron.ipcRenderer.send(WINDOW_CHANNELS.MAXIMIZE),
  close: () => electron.ipcRenderer.send(WINDOW_CHANNELS.CLOSE),
  isMaximized: () => electron.ipcRenderer.invoke(WINDOW_CHANNELS.IS_MAXIMIZED),
  onMaximizedChange: (cb) => {
    const listener = (_event, maximized) => {
      cb(maximized);
    };
    electron.ipcRenderer.on(WINDOW_CHANNELS.MAXIMIZED_CHANGE, listener);
    return () => electron.ipcRenderer.removeListener(WINDOW_CHANNELS.MAXIMIZED_CHANGE, listener);
  }
};
const whisperApi = {
  transcribe: (audioBuffer) => electron.ipcRenderer.invoke(WHISPER_CHANNELS.TRANSCRIBE, audioBuffer)
};
const logApi = {
  getLogs: () => electron.ipcRenderer.invoke(LOG_CHANNELS.GET_LOGS),
  onLog: (cb) => {
    const listener = (_event, entry) => {
      cb(entry);
    };
    electron.ipcRenderer.on(LOG_CHANNELS.ON_LOG, listener);
    return () => electron.ipcRenderer.removeListener(LOG_CHANNELS.ON_LOG, listener);
  }
};
electron.contextBridge.exposeInMainWorld("api", {
  pty: ptyApi,
  fs: fsApi,
  settings: settingsApi,
  session: sessionApi,
  shell: shellApi,
  clipboard: clipboardApi,
  window: windowApi,
  whisper: whisperApi,
  log: logApi
});
