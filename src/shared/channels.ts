export const PTY_CHANNELS = {
  CREATE: 'pty:create',
  WRITE: 'pty:write',
  RESIZE: 'pty:resize',
  DESTROY: 'pty:destroy',
  DATA: 'pty:data',
  EXIT: 'pty:exit'
} as const

export const FS_CHANNELS = {
  READ_DIR: 'fs:readDir',
  STAT: 'fs:stat',
  RENAME: 'fs:rename',
  DELETE: 'fs:delete',
  WATCH: 'fs:watch',
  UNWATCH: 'fs:unwatch',
  FS_EVENT: 'fs:event'
} as const
