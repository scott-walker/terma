import type WebSocket from 'ws'
import { nanoid } from 'nanoid'
import type { S2CMessage, C2SMessage } from '../../shared/share-types'
import type { PtyManager } from '../pty/pty-manager'
import { logger } from '../services/logger-service'

export interface IRemoteClient {
  readonly clientId: string
  send(msg: S2CMessage): void
  onMessage(cb: (msg: C2SMessage) => void): void
  onClose(cb: () => void): void
  terminate(): void
}

export class WsRemoteClient implements IRemoteClient {
  readonly clientId = nanoid()
  private ws: WebSocket

  constructor(ws: WebSocket) {
    this.ws = ws
  }

  send(msg: S2CMessage): void {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  onMessage(cb: (msg: C2SMessage) => void): void {
    this.ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as C2SMessage
        cb(msg)
      } catch {
        // ignore malformed messages
      }
    })
  }

  onClose(cb: () => void): void {
    this.ws.on('close', cb)
  }

  terminate(): void {
    this.ws.terminate()
  }
}

export class RemoteSession {
  readonly sessionId: string
  readonly ptyId: string
  private clients = new Set<IRemoteClient>()
  private unsubscribe: (() => void) | null = null
  private onEmpty: () => void
  private lastCols = 80
  private lastRows = 24

  constructor(
    sessionId: string,
    ptyId: string,
    ptyManager: PtyManager,
    onEmpty: () => void
  ) {
    this.sessionId = sessionId
    this.ptyId = ptyId
    this.onEmpty = onEmpty

    this.unsubscribe = ptyManager.subscribe(ptyId, (data) => {
      this.broadcast({ v: 1, type: 'output', data })
    })

    if (!this.unsubscribe) {
      logger.warn('share', `PTY ${ptyId} not found for session ${sessionId}`)
    }
  }

  addClient(client: IRemoteClient): void {
    this.clients.add(client)
    logger.info('share', `Client ${client.clientId} joined session ${this.sessionId}`)

    client.send({ v: 1, type: 'hello', sessionId: this.sessionId, cols: this.lastCols, rows: this.lastRows })

    client.onMessage((msg) => {
      if (msg.type === 'resize') {
        this.lastCols = msg.cols
        this.lastRows = msg.rows
      }
    })

    client.onClose(() => {
      this.removeClient(client.clientId)
    })
  }

  removeClient(clientId: string): void {
    for (const c of this.clients) {
      if (c.clientId === clientId) {
        this.clients.delete(c)
        logger.info('share', `Client ${clientId} left session ${this.sessionId}`)
        break
      }
    }
    if (this.clients.size === 0) {
      this.onEmpty()
    }
  }

  get clientCount(): number {
    return this.clients.size
  }

  broadcast(msg: S2CMessage): void {
    for (const c of this.clients) {
      c.send(msg)
    }
  }

  destroy(): void {
    this.broadcast({ v: 1, type: 'bye', reason: 'session-closed' })
    for (const c of this.clients) {
      c.terminate()
    }
    this.clients.clear()
    this.unsubscribe?.()
    this.unsubscribe = null
    logger.info('share', `Session ${this.sessionId} destroyed`)
  }
}
