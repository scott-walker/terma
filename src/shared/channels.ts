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
  STAT: 'fs:stat',
  RENAME: 'fs:rename',
  DELETE: 'fs:delete',
  COPY: 'fs:copy',
  COPY_PROGRESS: 'fs:copyProgress',
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
