# Terminal Share — шаринг терминала по LAN

Terminal Share позволяет открыть любой терминал на мобильном устройстве или другом компьютере в локальной сети. Встроенный HTTP/WebSocket-сервер раздаёт готовый xterm.js-клиент — отдельное приложение устанавливать не нужно.

---

## Быстрый старт

1. Открыть панель с терминалом или агентом
2. Нажать кнопку **Share** (иконка `Share2`) в правом углу PaneHeader
3. Откроется модалка с QR-кодом и URL сессии
4. Сканировать QR-код с телефона (телефон должен быть в той же Wi-Fi сети)
5. В браузере откроется полноэкранный интерактивный терминал
6. Закрыть модалку — шаринг продолжает работать в фоне

---

## Архитектура

```
  Renderer (React)              Main Process
┌──────────────────┐      ┌──────────────────────────────────────┐
│  PaneHeader      │      │  ShareService                        │
│   └─ ShareModal  │ IPC  │   ├─ HTTP server :port               │
│       └─ QRCode  │◄────►│   │   ├─ GET /t/:id  → HTML клиент  │
│  share-store     │      │   │   ├─ GET /xterm.js  (offline)    │
└──────────────────┘      │   │   ├─ GET /xterm.css (offline)    │
                          │   │   └─ WS  /ws → RemoteSession     │
                          │   └─ sessions Map<id, SessionEntry>   │
                          │                                        │
                          │  RemoteSession                        │
                          │   ├─ subscribe(PtyManager, ptyId)     │
                          │   ├─ clients Set<IRemoteClient>       │
                          │   └─ broadcast(S2CMessage)            │
                          │                                        │
                          │  WsRemoteClient : IRemoteClient       │
                          │   └─ wraps ws.WebSocket               │
                          └──────────────────────────────────────┘
```

### Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `src/shared/share-types.ts` | Типы протокола: `S2CMessage`, `C2SMessage`, `ShareSessionInfo` |
| `src/main/share/remote-session.ts` | `IRemoteClient`, `WsRemoteClient`, `RemoteSession` |
| `src/main/share/share-service.ts` | HTTP+WS сервер, раздача xterm.js оффлайн |
| `src/main/ipc/share-handlers.ts` | IPC-обёртки для `share:start/stop/status` |
| `src/renderer/src/stores/share-store.ts` | Zustand-хранилище: `paneId → ShareSessionInfo` |
| `src/renderer/src/components/share/ShareModal.tsx` | UI: QR-код, URL, счётчик клиентов |

---

## Протокол (share-types.ts)

Версионированные JSON-сообщения через WebSocket. Версия фиксируется в поле `v`, что позволяет добавлять новые типы без поломки старых клиентов.

```typescript
export const SHARE_PROTOCOL_VERSION = 1

// Сервер → Клиент
type S2CMessage =
  | { v: 1; type: 'hello'; sessionId: string; cols: number; rows: number }
  | { v: 1; type: 'output'; data: string }
  | { v: 1; type: 'resize'; cols: number; rows: number }
  | { v: 1; type: 'bye'; reason: 'session-closed' | 'kicked' }

// Клиент → Сервер
type C2SMessage =
  | { v: 1; type: 'input'; data: string }
  | { v: 1; type: 'resize'; cols: number; rows: number }
```

### Последовательность соединения

```
Client                    Server
  |                          |
  |── WS connect ──────────►|
  |                          |── hello { cols, rows } ──►|
  |                          |
  |◄── output (прошлый вывод не replayed) ──────────────|
  |                          |
  |── input { data } ──────►|── pty.write(data) ──────►PTY
  |                          |
  |── resize { cols, rows } ►|── pty.resize(cols, rows) ►PTY
  |                          |
  |◄── bye { reason } ───── при закрытии сессии
```

> **Важно:** прошлый вывод терминала не воспроизводится при подключении — клиент видит только новые данные с момента соединения. PTY один на всех — ввод с телефона попадает в тот же шелл, что и на десктопе.

---

## ShareService

**Файл:** `src/main/share/share-service.ts`

### `start(ptyId, ptyManager): Promise<ShareSessionInfo>`

Поднимает HTTP+WS сервер на случайном свободном порту. Если PTY уже расшарен, возвращает существующую сессию.

- Определяет локальный IP через `networkInterfaces()` (первый не-internal IPv4)
- Создаёт `RemoteSession`, подписывается на данные PTY через `ptyManager.subscribe()`
- HTTP-сервер раздаёт клиент оффлайн (файлы из `node_modules/@xterm/`)
- WS-upgrade происходит на пути `/ws`

```typescript
const info: ShareSessionInfo = {
  sessionId: string,   // nanoid(10)
  ptyId: string,       // исходный PTY ID
  url: string,         // http://192.168.x.x:port/t/:sessionId
  port: number,
  clientCount: number, // текущее число WS-соединений
  createdAt: number    // timestamp
}
```

### `stop(sessionId)`

Отправляет `bye` всем клиентам, закрывает WS-соединения и HTTP-сервер, освобождает порт.

### `stopAll()`

Вызывается при `window-all-closed` и `before-quit` — закрывает все активные сессии.

### `getStatus(sessionId): ShareSessionInfo | null`

Возвращает актуальную информацию о сессии (в том числе обновлённый `clientCount`).

---

## RemoteSession и IRemoteClient

**Файл:** `src/main/share/remote-session.ts`

Transport-агностическая архитектура: `RemoteSession` не знает про WebSocket, она работает с абстракцией `IRemoteClient`.

```typescript
interface IRemoteClient {
  readonly clientId: string
  send(msg: S2CMessage): void
  onMessage(cb: (msg: C2SMessage) => void): void
  onClose(cb: () => void): void
  terminate(): void
}
```

`WsRemoteClient` реализует `IRemoteClient` поверх `ws.WebSocket`. В будущем можно добавить нативный клиент (TCP, BLE и т.д.) без изменения `RemoteSession`.

При создании `RemoteSession` вызывает `ptyManager.subscribe(ptyId, cb)`, который возвращает функцию отписки — та вызывается при `destroy()`.

---

## PtyManager.subscribe()

**Файл:** `src/main/pty/pty-manager.ts`

Добавленный метод позволяет нескольким подписчикам слушать данные из одного PTY независимо от основного renderer-listener'а:

```typescript
subscribe(id: string, cb: (data: string) => void): (() => void) | null
```

Возвращает функцию отписки (`IDisposable.dispose()`) или `null`, если PTY не найден.

---

## Share API (renderer)

Доступен через `window.api.share`:

```typescript
// Начать шаринг PTY
const info: ShareSessionInfo = await window.api.share.start(ptyId)

// Остановить сессию по ID
await window.api.share.stop(sessionId)

// Получить актуальный статус (включая clientCount)
const info: ShareSessionInfo | null = await window.api.share.status(sessionId)
```

---

## share-store (Zustand)

**Файл:** `src/renderer/src/stores/share-store.ts`

Хранит активные сессии по `paneId`:

```typescript
const { startShare, stopShare, getSession, refreshStatus } = useShareStore()

// Запустить шаринг
const info = await startShare(ptyId, paneId)

// Остановить (вызывает stop на сервере + удаляет из store)
await stopShare(paneId)

// Проверить активна ли сессия
const session = getSession(paneId)

// Обновить clientCount (вызывается в ShareModal каждые 3 сек)
await refreshStatus(paneId)
```

---

## ShareModal

**Файл:** `src/renderer/src/components/share/ShareModal.tsx`

- Автоматически запускает шаринг при открытии (если сессия ещё не активна)
- QR-код (200×200, библиотека `qrcode.react`) и кликабельный URL с кнопкой Copy
- Счётчик активных подключений, обновляется каждые 3 секунды
- **Закрыть модалку ≠ остановить шаринг** — сессия продолжает работать
- Кнопка "Stop sharing" — останавливает сервер и закрывает модалку

---

## Мобильный веб-клиент

Встроен как template-string в `ShareService`. Загружается из `http://<ip>:<port>/t/<sessionId>`.

Зависимости загружаются с десктопа (не с CDN), поэтому работает полностью оффлайн при наличии Wi-Fi между устройствами:

| Путь | Файл |
|------|------|
| `/xterm.js` | `node_modules/@xterm/xterm/lib/xterm.js` |
| `/xterm.css` | `node_modules/@xterm/xterm/css/xterm.css` |
| `/addon-fit.js` | `node_modules/@xterm/addon-fit/lib/addon-fit.js` |

Возможности клиента:
- Полноэкранный тёмный терминал, оптимизирован под мобильный (viewport meta, `user-scalable=no`)
- WS auto-connect при загрузке страницы
- `hello` → `term.resize(cols, rows)` для правильных начальных размеров
- `output` → `term.write(data)` — живой вывод
- `term.onData` → отправка `input` — ввод с виртуальной клавиатуры
- `ResizeObserver` → `FitAddon.fit()` → `resize` при повороте экрана или изменении размера
- Реконнект: до 3 попыток с интервалом 5 секунд

---

## Ограничения

- Устройства должны быть в одной локальной сети (LAN/Wi-Fi)
- Шаринг работает только для панелей типа `terminal` и `agent`
- Прошлый вывод терминала не replayed при подключении — видно только новые данные
- Одна сессия на PTY (повторный `share:start` возвращает существующую сессию)
- Нет аутентификации — любой в сети может подключиться по URL
