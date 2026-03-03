import { createServer, IncomingMessage, ServerResponse, Server } from 'http'
import { networkInterfaces } from 'os'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { nanoid } from 'nanoid'
import { WebSocketServer } from 'ws'
import type { ShareSessionInfo } from '../../shared/share-types'
import { RemoteSession, WsRemoteClient } from './remote-session'
import type { PtyManager } from '../pty/pty-manager'
import { logger } from '../services/logger-service'

interface SessionEntry {
  session: RemoteSession
  server: Server
  wss: WebSocketServer
  port: number
  url: string
  createdAt: number
}

function getLocalIp(): string {
  const nets = networkInterfaces()
  for (const ifaces of Object.values(nets)) {
    if (!ifaces) continue
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return '127.0.0.1'
}

function getXtermPath(): string {
  try {
    return require.resolve('@xterm/xterm/lib/xterm.js')
  } catch {
    return join(__dirname, '../../node_modules/@xterm/xterm/lib/xterm.js')
  }
}

function getAddonFitPath(): string {
  try {
    return require.resolve('@xterm/addon-fit/lib/addon-fit.js')
  } catch {
    return join(__dirname, '../../node_modules/@xterm/addon-fit/lib/addon-fit.js')
  }
}

function buildHtml(url: string, sessionId: string): string {
  // url = http://ip:port/t/sessionId — нужен ws://ip:port/ws
  const wsUrl = url.replace(/\/t\/.*$/, '').replace(/^http/, 'ws') + '/ws'
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Terma</title>
<link rel="stylesheet" href="/xterm.css">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; background: #0d1117; overflow: hidden; }
#terminal { width: 100%; height: 100%; }
.xterm { height: 100%; }
.xterm-viewport { overflow-y: hidden !important; }
</style>
</head>
<body>
<div id="terminal"></div>
<script src="/xterm.js"></script>
<script src="/addon-fit.js"></script>
<script>
(function() {
  var term = new Terminal({
    theme: { background: '#0d1117', foreground: '#e6edf3', cursor: '#e6edf3', selectionBackground: '#264f78' },
    fontFamily: 'monospace',
    fontSize: 14,
    cursorBlink: true,
    allowProposedApi: true
  })
  var fitAddon = new FitAddon.FitAddon()
  term.loadAddon(fitAddon)
  term.open(document.getElementById('terminal'))
  fitAddon.fit()

  var WS_URL = ${JSON.stringify(wsUrl)}
  var SESSION_ID = ${JSON.stringify(sessionId)}
  var MAX_RETRIES = 3
  var retries = 0
  var ws = null

  function connect() {
    ws = new WebSocket(WS_URL)
    ws.onopen = function() { retries = 0 }
    ws.onmessage = function(e) {
      try {
        var msg = JSON.parse(e.data)
        if (msg.type === 'hello') {
          term.resize(msg.cols, msg.rows)
        } else if (msg.type === 'output') {
          term.write(msg.data)
        } else if (msg.type === 'resize') {
          term.resize(msg.cols, msg.rows)
        } else if (msg.type === 'bye') {
          term.writeln('\\r\\n\\x1b[33m[Session ended]\\x1b[0m')
          ws.close()
        }
      } catch(ex) {}
    }
    ws.onclose = function() {
      if (retries < MAX_RETRIES) {
        retries++
        setTimeout(connect, 5000)
        term.writeln('\\r\\n\\x1b[33m[Reconnecting... ' + retries + '/' + MAX_RETRIES + ']\\x1b[0m')
      } else {
        term.writeln('\\r\\n\\x1b[31m[Connection lost]\\x1b[0m')
      }
    }
  }

  connect()

  function sendInput(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ v: 1, type: 'input', data: data }))
    }
  }

  var isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)

  if (isMobile) {
    // На мобильных используем скрытый <input> с отключённой автокоррекцией.
    // xterm.js-textarea не имеет autocorrect=off, поэтому Android IME
    // заменяет введённое слово при нажатии пробела.
    var inp = document.createElement('input')
    inp.type = 'text'
    inp.setAttribute('autocomplete', 'off')
    inp.setAttribute('autocorrect', 'off')
    inp.setAttribute('autocapitalize', 'none')
    inp.setAttribute('spellcheck', 'false')
    inp.setAttribute('inputmode', 'text')
    // font-size ≥ 16px — предотвращает авто-зум в iOS Safari
    inp.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;font-size:16px;'
    document.body.appendChild(inp)
    inp.focus()

    // Тап по терминалу → фокус на скрытый input
    document.getElementById('terminal').addEventListener('click', function() { inp.focus() })

    var lastVal = ''

    inp.addEventListener('keydown', function(e) {
      switch (e.key) {
        case 'Backspace':  sendInput('\x7f'); break
        case 'Enter':      sendInput('\r'); e.preventDefault(); break
        case 'Tab':        sendInput('\t'); e.preventDefault(); break
        case 'Escape':     sendInput('\x1b'); e.preventDefault(); break
        case 'ArrowUp':    sendInput('\x1b[A'); e.preventDefault(); break
        case 'ArrowDown':  sendInput('\x1b[B'); e.preventDefault(); break
        case 'ArrowRight': sendInput('\x1b[C'); e.preventDefault(); break
        case 'ArrowLeft':  sendInput('\x1b[D'); e.preventDefault(); break
      }
    })

    inp.addEventListener('input', function() {
      var val = inp.value
      // Отправляем только добавленные символы (дельта)
      if (val.length > lastVal.length) {
        sendInput(val.slice(lastVal.length))
      }
      lastVal = val
      // Сбрасываем накопленное значение раз в 200 символов
      if (val.length > 200) { inp.value = ''; lastVal = '' }
    })
  } else {
    // Desktop: стандартный обработчик xterm.js
    term.onData(function(data) { sendInput(data) })
  }

  var resizeTimer = null
  var ro = new ResizeObserver(function() {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(function() {
      fitAddon.fit()
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ v: 1, type: 'resize', cols: term.cols, rows: term.rows }))
      }
    }, 100)
  })
  ro.observe(document.getElementById('terminal'))
})()
</script>
</body>
</html>`
}

export class ShareService {
  private sessions = new Map<string, SessionEntry>()
  // ptyId → sessionId (one share per PTY)
  private ptyToSession = new Map<string, string>()

  async start(ptyId: string, ptyManager: PtyManager): Promise<ShareSessionInfo> {
    // If PTY already shared, return existing session
    const existingId = this.ptyToSession.get(ptyId)
    if (existingId) {
      const existing = this.sessions.get(existingId)
      if (existing) {
        return this.toInfo(existingId, existing)
      }
    }

    const port = await this.findFreePort()
    const ip = getLocalIp()
    const sessionId = nanoid(10)
    const url = `http://${ip}:${port}/t/${sessionId}`

    const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      this.handleHttp(req, res, sessionId, url)
    })

    const wss = new WebSocketServer({ noServer: true })

    httpServer.on('upgrade', (req, socket, head) => {
      const pathname = new URL(req.url ?? '/', `http://localhost`).pathname
      if (pathname === '/ws') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          const entry = this.sessions.get(sessionId)
          if (!entry) { ws.terminate(); return }
          const client = new WsRemoteClient(ws)
          entry.session.addClient(client)
        })
      } else {
        socket.destroy()
      }
    })

    const session = new RemoteSession(sessionId, ptyId, ptyManager, () => {
      // don't auto-stop when empty — let user stop explicitly
    })

    await new Promise<void>((resolve, reject) => {
      httpServer.listen(port, '0.0.0.0', () => resolve())
      httpServer.once('error', reject)
    })

    const entry: SessionEntry = {
      session,
      server: httpServer,
      wss,
      port,
      url,
      createdAt: Date.now()
    }

    this.sessions.set(sessionId, entry)
    this.ptyToSession.set(ptyId, sessionId)
    logger.info('share', `Started session ${sessionId} on port ${port}`)

    return this.toInfo(sessionId, entry)
  }

  stop(sessionId: string): void {
    const entry = this.sessions.get(sessionId)
    if (!entry) return
    entry.session.destroy()
    entry.wss.close()
    entry.server.close()
    this.ptyToSession.delete(entry.session.ptyId)
    this.sessions.delete(sessionId)
    logger.info('share', `Stopped session ${sessionId}`)
  }

  stopAll(): void {
    for (const sessionId of this.sessions.keys()) {
      this.stop(sessionId)
    }
  }

  getStatus(sessionId: string): ShareSessionInfo | null {
    const entry = this.sessions.get(sessionId)
    if (!entry) return null
    return this.toInfo(sessionId, entry)
  }

  private toInfo(sessionId: string, entry: SessionEntry): ShareSessionInfo {
    return {
      sessionId,
      ptyId: entry.session.ptyId,
      url: entry.url,
      port: entry.port,
      clientCount: entry.session.clientCount,
      createdAt: entry.createdAt
    }
  }

  private async handleHttp(req: IncomingMessage, res: ServerResponse, sessionId: string, url: string): Promise<void> {
    const pathname = new URL(req.url ?? '/', `http://localhost`).pathname

    if (pathname === `/t/${sessionId}` || pathname === `/t/${sessionId}/`) {
      const html = buildHtml(url, sessionId)
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)
      return
    }

    if (pathname === '/xterm.js') {
      try {
        const data = await readFile(getXtermPath())
        res.writeHead(200, { 'Content-Type': 'application/javascript' })
        res.end(data)
      } catch {
        res.writeHead(404)
        res.end()
      }
      return
    }

    if (pathname === '/xterm.css') {
      try {
        const cssPath = getXtermPath().replace(/lib[/\\]xterm\.js$/, 'css/xterm.css')
        const data = await readFile(cssPath)
        res.writeHead(200, { 'Content-Type': 'text/css' })
        res.end(data)
      } catch {
        res.writeHead(200, { 'Content-Type': 'text/css' })
        res.end('')
      }
      return
    }

    if (pathname === '/addon-fit.js') {
      try {
        const data = await readFile(getAddonFitPath())
        res.writeHead(200, { 'Content-Type': 'application/javascript' })
        res.end(data)
      } catch {
        res.writeHead(404)
        res.end()
      }
      return
    }

    res.writeHead(404)
    res.end()
  }

  private findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const srv = createServer()
      srv.listen(0, '0.0.0.0', () => {
        const addr = srv.address()
        srv.close(() => {
          if (addr && typeof addr === 'object') {
            resolve(addr.port)
          } else {
            reject(new Error('Could not get free port'))
          }
        })
      })
    })
  }
}
