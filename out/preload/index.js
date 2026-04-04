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
  READ_FILE: "fs:readFile",
  READ_FILE_DATA_URL: "fs:readFileDataUrl",
  STAT: "fs:stat",
  RENAME: "fs:rename",
  DELETE: "fs:delete",
  RESTORE: "fs:restore",
  COPY: "fs:copy",
  COPY_PROGRESS: "fs:copyProgress",
  SEARCH_FILES: "fs:searchFiles",
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
  WRITE_FILE_PATHS: "clipboard:writeFilePaths",
  SAVE_IMAGE: "clipboard:saveImage"
};
const WHISPER_CHANNELS = {
  TRANSCRIBE: "whisper:transcribe"
};
const WINDOW_CHANNELS = {
  MINIMIZE: "window:minimize",
  MAXIMIZE: "window:maximize",
  CLOSE: "window:close",
  FORCE_CLOSE: "window:force-close",
  CONFIRM_CLOSE: "window:confirm-close",
  IS_MAXIMIZED: "window:isMaximized",
  MAXIMIZED_CHANGE: "window:maximized-change"
};
const LOG_CHANNELS = {
  GET_LOGS: "log:getLogs",
  ON_LOG: "log:onLog",
  RENDERER_LOG: "log:rendererLog"
};
const TRANSLATE_CHANNELS = {
  TRANSLATE: "translate:translate",
  DEFINE: "translate:define",
  SUMMARIZE: "translate:summarize"
};
const TTS_CHANNELS = {
  SPEAK: "tts:speak",
  STREAM: "tts:stream"
};
const SYSMON_CHANNELS = {
  METRICS: "sysmon:metrics"
};
const SELFMON_CHANNELS = {
  METRICS: "selfmon:metrics"
};
const GIT_CHANNELS = {
  GET_INFO: "git:getInfo",
  LIST_BRANCHES: "git:listBranches",
  CHECKOUT: "git:checkout",
  CREATE_BRANCH: "git:createBranch"
};
const SSH_CHANNELS = {
  CONNECT: "ssh:connect",
  DISCONNECT: "ssh:disconnect",
  READ_DIR: "ssh:readDir",
  GET_HOME_DIR: "ssh:getHomeDir"
};
const SHARE_CHANNELS = {
  START: "share:start",
  STOP: "share:stop",
  STATUS: "share:status"
};
const dataListeners = /* @__PURE__ */ new Map();
const exitListeners = /* @__PURE__ */ new Map();
electron.ipcRenderer.on(PTY_CHANNELS.DATA, (_event, id, data) => {
  dataListeners.get(id)?.(data);
});
electron.ipcRenderer.on(PTY_CHANNELS.EXIT, (_event, id, exitCode, signal) => {
  exitListeners.get(id)?.(exitCode, signal);
});
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
  onData: (id, cb) => {
    dataListeners.set(id, cb);
    return () => {
      dataListeners.delete(id);
    };
  },
  onExit: (id, cb) => {
    exitListeners.set(id, cb);
    return () => {
      exitListeners.delete(id);
    };
  }
};
const fsApi = {
  readDir: (dirPath) => electron.ipcRenderer.invoke(FS_CHANNELS.READ_DIR, dirPath),
  readFile: (filePath) => electron.ipcRenderer.invoke(FS_CHANNELS.READ_FILE, filePath),
  readFileAsDataUrl: (filePath) => electron.ipcRenderer.invoke(FS_CHANNELS.READ_FILE_DATA_URL, filePath),
  stat: (filePath) => electron.ipcRenderer.invoke(FS_CHANNELS.STAT, filePath),
  rename: (oldPath, newPath) => electron.ipcRenderer.invoke(FS_CHANNELS.RENAME, oldPath, newPath),
  delete: (filePath) => electron.ipcRenderer.invoke(FS_CHANNELS.DELETE, filePath),
  restore: (originalPaths) => electron.ipcRenderer.invoke(FS_CHANNELS.RESTORE, originalPaths),
  copy: (srcPath, destDir) => electron.ipcRenderer.invoke(FS_CHANNELS.COPY, srcPath, destDir),
  searchFiles: (rootDir, query) => electron.ipcRenderer.invoke(FS_CHANNELS.SEARCH_FILES, rootDir, query),
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
  homePath: os.homedir(),
  platform: process.platform
};
const clipboardApi = {
  readFilePaths: () => electron.ipcRenderer.invoke(CLIPBOARD_CHANNELS.READ_FILE_PATHS),
  writeFilePaths: (paths) => electron.ipcRenderer.invoke(CLIPBOARD_CHANNELS.WRITE_FILE_PATHS, paths),
  saveImage: (destDir) => electron.ipcRenderer.invoke(CLIPBOARD_CHANNELS.SAVE_IMAGE, destDir)
};
const windowApi = {
  minimize: () => electron.ipcRenderer.send(WINDOW_CHANNELS.MINIMIZE),
  maximize: () => electron.ipcRenderer.send(WINDOW_CHANNELS.MAXIMIZE),
  close: () => electron.ipcRenderer.send(WINDOW_CHANNELS.CLOSE),
  forceClose: () => electron.ipcRenderer.send(WINDOW_CHANNELS.FORCE_CLOSE),
  isMaximized: () => electron.ipcRenderer.invoke(WINDOW_CHANNELS.IS_MAXIMIZED),
  onMaximizedChange: (cb) => {
    const listener = (_event, maximized) => {
      cb(maximized);
    };
    electron.ipcRenderer.on(WINDOW_CHANNELS.MAXIMIZED_CHANGE, listener);
    return () => electron.ipcRenderer.removeListener(WINDOW_CHANNELS.MAXIMIZED_CHANGE, listener);
  },
  onConfirmClose: (cb) => {
    const listener = () => {
      cb();
    };
    electron.ipcRenderer.on(WINDOW_CHANNELS.CONFIRM_CLOSE, listener);
    return () => electron.ipcRenderer.removeListener(WINDOW_CHANNELS.CONFIRM_CLOSE, listener);
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
  },
  rendererLog: (level, source, message) => {
    electron.ipcRenderer.invoke(LOG_CHANNELS.RENDERER_LOG, level, source, message);
  }
};
const translateApi = {
  translate: (text) => electron.ipcRenderer.invoke(TRANSLATE_CHANNELS.TRANSLATE, text),
  define: (text, rephrase) => electron.ipcRenderer.invoke(TRANSLATE_CHANNELS.DEFINE, text, rephrase),
  summarize: (text) => electron.ipcRenderer.invoke(TRANSLATE_CHANNELS.SUMMARIZE, text)
};
const ttsStreamListeners = /* @__PURE__ */ new Map();
electron.ipcRenderer.on(TTS_CHANNELS.STREAM, (_event, streamId, data) => {
  ttsStreamListeners.get(streamId)?.(data);
  if (data.type === "done" || data.type === "error") {
    ttsStreamListeners.delete(streamId);
  }
});
const ttsApi = {
  speak: (text) => electron.ipcRenderer.invoke(TTS_CHANNELS.SPEAK, text),
  onStream: (streamId, cb) => {
    ttsStreamListeners.set(streamId, cb);
    return () => {
      ttsStreamListeners.delete(streamId);
    };
  }
};
const sysmonApi = {
  getMetrics: () => electron.ipcRenderer.invoke(SYSMON_CHANNELS.METRICS)
};
const gitApi = {
  getInfo: (cwd) => electron.ipcRenderer.invoke(GIT_CHANNELS.GET_INFO, cwd),
  listBranches: (cwd) => electron.ipcRenderer.invoke(GIT_CHANNELS.LIST_BRANCHES, cwd),
  checkout: (cwd, branch) => electron.ipcRenderer.invoke(GIT_CHANNELS.CHECKOUT, cwd, branch),
  createBranch: (cwd, name) => electron.ipcRenderer.invoke(GIT_CHANNELS.CREATE_BRANCH, cwd, name)
};
const sshApi = {
  connect: (profileId) => electron.ipcRenderer.invoke(SSH_CHANNELS.CONNECT, profileId),
  disconnect: (profileId) => electron.ipcRenderer.invoke(SSH_CHANNELS.DISCONNECT, profileId),
  readDir: (profileId, remotePath) => electron.ipcRenderer.invoke(SSH_CHANNELS.READ_DIR, profileId, remotePath),
  getHomeDir: (profileId) => electron.ipcRenderer.invoke(SSH_CHANNELS.GET_HOME_DIR, profileId)
};
const selfmonApi = {
  getMetrics: () => electron.ipcRenderer.invoke(SELFMON_CHANNELS.METRICS)
};
const shareApi = {
  start: (ptyId) => electron.ipcRenderer.invoke(SHARE_CHANNELS.START, ptyId),
  stop: (sessionId) => electron.ipcRenderer.invoke(SHARE_CHANNELS.STOP, sessionId),
  status: (sessionId) => electron.ipcRenderer.invoke(SHARE_CHANNELS.STATUS, sessionId)
};
const zoomApi = {
  setFactor: (factor) => {
    electron.webFrame.setZoomFactor(factor);
  },
  getFactor: () => electron.webFrame.getZoomFactor()
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
  log: logApi,
  ssh: sshApi,
  translate: translateApi,
  tts: ttsApi,
  sysmon: sysmonApi,
  selfmon: selfmonApi,
  git: gitApi,
  share: shareApi,
  zoom: zoomApi
});
