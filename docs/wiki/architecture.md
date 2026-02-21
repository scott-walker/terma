# Обзор архитектуры

Terma следует стандартной модели Electron с тремя процессами, строгой изоляцией через `contextBridge` и однонаправленным потоком данных.

## Процессы

```
┌─────────────────────────────────────────────────────┐
│                   Main Process                       │
│                                                     │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────┐ │
│  │  PtyManager   │  │ FsService │  │  FsWatcher   │ │
│  │  (node-pty)   │  │ (fs/promises)│ (chokidar)  │ │
│  └──────┬───────┘  └─────┬─────┘  └──────┬───────┘ │
│         │                │               │          │
│         └────────────────┼───────────────┘          │
│                          │                          │
│                   IPC Handlers                      │
└──────────────────────────┬──────────────────────────┘
                           │ ipcMain ↔ ipcRenderer
┌──────────────────────────┼──────────────────────────┐
│                   Preload Script                     │
│                                                     │
│              contextBridge.exposeInMainWorld         │
│              window.api = { pty, fs, window }       │
└──────────────────────────┬──────────────────────────┘
                           │ window.api
┌──────────────────────────┼──────────────────────────┐
│                  Renderer Process                    │
│                                                     │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Zustand    │  │   React      │  │  xterm.js   │ │
│  │  Stores     │  │   Components │  │  Terminal   │ │
│  └────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Main Process

**Ответственность:**
- Создание и управление окнами (`BrowserWindow`)
- Управление PTY-сессиями через `node-pty`
- Работа с файловой системой (чтение, запись, наблюдение)
- Обработка IPC-запросов от renderer

**Ключевые классы:**
- `PtyManager` — менеджер терминальных сессий (Map-based)
- `FsService` — асинхронные операции с файловой системой
- `FsWatcher` — наблюдение за изменениями через chokidar

Подробнее: [Main process](main-process.md)

## Preload Script

**Ответственность:**
- Безопасный мост между main и renderer через `contextBridge`
- Экспорт типизированного API в `window.api`
- Управление подписками на IPC-события (с корректной отпиской)

Preload предоставляет три API:
- `window.api.pty` — создание/управление PTY-сессиями
- `window.api.fs` — операции с файловой системой
- `window.api.window` — управление окном (minimize/maximize/close)

Подробнее: [Preload и IPC API](ipc-api.md)

## Renderer Process

**Ответственность:**
- UI на React с Tailwind CSS
- Управление состоянием через Zustand stores
- Рендеринг терминала через xterm.js
- Обработка пользовательского ввода и горячих клавиш

**Zustand stores:**
- `tab-store` — табы и layout-деревья
- `file-manager-store` — состояние файлового менеджера
- `workspace-store` — рабочие пространства
- `terminal-store` — реестр терминальных сессий

Подробнее: [Renderer process](renderer-process.md)

## Поток данных терминала

```
Пользователь вводит текст
        │
        ▼
  xterm.onData(data)
        │
        ▼
  window.api.pty.write(id, data)     ← ipcRenderer.send (fire-and-forget)
        │
        ▼
  ipcMain.on('pty:write')
        │
        ▼
  pty.write(data)                    ← node-pty записывает в PTY
        │
        ▼
  pty.onData(data)                   ← shell возвращает вывод
        │
        ▼
  webContents.send('pty:data', id, data)
        │
        ▼
  window.api.pty.onData callback
        │
        ▼
  terminal.write(data)              ← xterm.js отображает вывод
```

Ключевой момент: `pty:write` использует `ipcRenderer.send` (fire-and-forget), а не `invoke`, чтобы минимизировать задержку ввода.

## Поток ресайза

```
ResizeObserver (контейнер изменился)
        │
        ▼
  fitAddon.fit()                    ← xterm.js пересчитывает cols/rows
        │
        ▼
  terminal.onResize({ cols, rows })
        │
        ▼
  window.api.pty.resize(id, cols, rows)
        │
        ▼
  pty.resize(cols, rows)            ← node-pty обновляет размер PTY
```

## Принципы архитектуры

1. **Строгая изоляция** — renderer не имеет прямого доступа к Node.js API. Всё идёт через `contextBridge`.

2. **Fire-and-forget для ввода** — `pty:write` и `pty:resize` используют `send` (без ожидания ответа) для минимальной задержки.

3. **Invoke для создания** — `pty:create` использует `invoke` (с ответом), так как renderer нужен ID созданной сессии.

4. **Immutable state** — Zustand stores не мутируют состояние напрямую, всегда возвращают новый объект.

5. **Древовидный layout** — система панелей использует рекурсивное дерево `LayoutNode`, что позволяет неограниченную вложенность сплитов.
