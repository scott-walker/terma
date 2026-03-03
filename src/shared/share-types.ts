export const SHARE_PROTOCOL_VERSION = 1

// Server → Client
export type S2CMessage =
  | { v: 1; type: 'hello'; sessionId: string; cols: number; rows: number }
  | { v: 1; type: 'output'; data: string }
  | { v: 1; type: 'resize'; cols: number; rows: number }
  | { v: 1; type: 'bye'; reason: 'session-closed' | 'kicked' }

// Client → Server
export type C2SMessage =
  | { v: 1; type: 'input'; data: string }
  | { v: 1; type: 'resize'; cols: number; rows: number }

export interface ShareSessionInfo {
  sessionId: string
  ptyId: string
  url: string
  port: number
  clientCount: number
  createdAt: number
}
