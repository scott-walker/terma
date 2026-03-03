export const PTY_CHANNELS = {
  CREATE: 'pty:create',
  WRITE: 'pty:write',
  RESIZE: 'pty:resize',
  DESTROY: 'pty:destroy',
  DATA: 'pty:data',
  EXIT: 'pty:exit',
  GET_CWD: 'pty:getCwd'
} as const

export const FS_CHANNELS = {
  READ_DIR: 'fs:readDir',
  READ_FILE: 'fs:readFile',
  READ_FILE_DATA_URL: 'fs:readFileDataUrl',
  STAT: 'fs:stat',
  RENAME: 'fs:rename',
  DELETE: 'fs:delete',
  RESTORE: 'fs:restore',
  COPY: 'fs:copy',
  COPY_PROGRESS: 'fs:copyProgress',
  SEARCH_FILES: 'fs:searchFiles',
  WATCH: 'fs:watch',
  UNWATCH: 'fs:unwatch',
  FS_EVENT: 'fs:event'
} as const

export const SETTINGS_CHANNELS = {
  GET: 'settings:get',
  UPDATE: 'settings:update',
  RESET: 'settings:reset',
  CHANGED: 'settings:changed'
} as const

export const SESSION_CHANNELS = {
  SAVE: 'session:save',
  LOAD: 'session:load'
} as const

export const SHELL_CHANNELS = {
  OPEN_PATH: 'shell:openPath',
  OPEN_WITH: 'shell:openWith'
} as const

export const CLIPBOARD_CHANNELS = {
  READ_FILE_PATHS: 'clipboard:readFilePaths',
  WRITE_FILE_PATHS: 'clipboard:writeFilePaths',
  SAVE_IMAGE: 'clipboard:saveImage'
} as const

export const WHISPER_CHANNELS = {
  TRANSCRIBE: 'whisper:transcribe'
} as const

export const WINDOW_CHANNELS = {
  MINIMIZE: 'window:minimize',
  MAXIMIZE: 'window:maximize',
  CLOSE: 'window:close',
  FORCE_CLOSE: 'window:force-close',
  CONFIRM_CLOSE: 'window:confirm-close',
  IS_MAXIMIZED: 'window:isMaximized',
  MAXIMIZED_CHANGE: 'window:maximized-change'
} as const

export const LOG_CHANNELS = {
  GET_LOGS: 'log:getLogs',
  ON_LOG: 'log:onLog'
} as const

export const TRANSLATE_CHANNELS = {
  TRANSLATE: 'translate:translate'
} as const

export const TTS_CHANNELS = {
  SPEAK: 'tts:speak',
  STREAM: 'tts:stream'
} as const

export const SYSMON_CHANNELS = {
  METRICS: 'sysmon:metrics'
} as const

export const SELFMON_CHANNELS = {
  METRICS: 'selfmon:metrics'
} as const

export const GIT_CHANNELS = {
  GET_INFO: 'git:getInfo',
  LIST_BRANCHES: 'git:listBranches',
  CHECKOUT: 'git:checkout',
  CREATE_BRANCH: 'git:createBranch'
} as const

export const SSH_CHANNELS = {
  CONNECT: 'ssh:connect',
  DISCONNECT: 'ssh:disconnect',
  READ_DIR: 'ssh:readDir',
  GET_HOME_DIR: 'ssh:getHomeDir'
} as const

export const SHARE_CHANNELS = {
  START: 'share:start',
  STOP: 'share:stop',
  STATUS: 'share:status'
} as const

