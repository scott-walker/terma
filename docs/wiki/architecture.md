# Обзор архитектуры

Terma следует стандартной модели Electron с тремя процессами, строгой изоляцией через `contextBridge` и однонаправленным потоком данных.

## Процессы

```
┌─────────────────────────────────────────────────────┐
│                   Main Process                       │
│                                                     │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────┐ │
│  │  PtyManager   │  │ FsService │  │  FsWatcher   │ │
│  │  (node-pty)   │  │(fs/promises)│ (chokidar)   │ │
│  └──────┬───────┘  └─────┬─────┘  └──────┬───────┘ │
│         │                │               │          │
│  ┌──────┴───────┐  ┌─────┴─────┐  ┌──────┴───────┐ │
│  │SessionService│  │ Settings  │  │LoggerService │ │
│  │(electron-store)│ │ Service  │  │ (in-memory)  │ │
│  └──────┬───────┘  └─────┬─────┘  └──────┬───────┘ │
│         │                │               │          │
│         └────────────────┼───────────────┘          │
│                          │                          │
│                   IPC Handlers                      │
│        (handlers, session, settings, whisper, log)  │
└──────────────────────────┬──────────────────────────┘
                           │ ipcMain ↔ ipcRenderer
┌──────────────────────────┼──────────────────────────┐
│                   Preload Script                     │
│                                                     │
│              contextBridge.exposeInMainWorld         │
│     window.api = { pty, fs, settings, session,      │
│       shell, clipboard, window, whisper, log }      │
└──────────────────────────┬──────────────────────────┘
                           │ window.api
┌──────────────────────────┼──────────────────────────┐
│                  Renderer Process                    │
│                                                     │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Zustand    │  │   React      │  │  xterm.js   │ │
│  │  Stores     │  │   Components │  │  Terminal   │ │
│  └────────────┘  └──────────────┘  └─────────────┘ │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │         terminal-manager.ts                   │   │
│  │    (реестр xterm instances, attach/detach)    │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Main Process

**Ответственность:**
- Создание и управление окнами (`BrowserWindow`)
- Управление PTY-сессиями через `node-pty`
- Работа с файловой системой (чтение, копирование, удаление, trash, наблюдение)
- Персистентность настроек и сессий через `electron-store`
- Голосовая транскрипция через OpenAI Whisper API
- In-memory логирование с broadcast в renderer

**Ключевые сервисы:**
- `PtyManager` — менеджер терминальных сессий (Map-based)
- `FsService` — асинхронные операции с файловой системой
- `FsWatcher` — наблюдение за изменениями через chokidar
- `SessionService` — сохранение/загрузка сессий (electron-store)
- `SettingsService` — настройки приложения (electron-store)
- `LoggerService` — in-memory буфер логов (до 500 записей) + broadcast
- `PlatformService` — платформо-зависимая логика

Подробнее: [Main process](main-process.md)

## Preload Script

**Ответственность:**
- Безопасный мост между main и renderer через `contextBridge`
- Экспорт типизированного API в `window.api`
- Управление подписками на IPC-события (с корректной отпиской)

Preload предоставляет 9 API-групп:
- `window.api.pty` — создание/управление PTY-сессиями
- `window.api.fs` — операции с файловой системой
- `window.api.settings` — чтение/изменение настроек
- `window.api.session` — сохранение/загрузка сессий
- `window.api.shell` — открытие файлов/путей в системе
- `window.api.clipboard` — работа с буфером обмена
- `window.api.window` — управление окном
- `window.api.whisper` — голосовая транскрипция
- `window.api.log` — доступ к логам приложения

Подробнее: [Preload и IPC API](ipc-api.md)

## Renderer Process

**Ответственность:**
- UI на React с Tailwind CSS v4
- Управление состоянием через Zustand stores
- Рендеринг терминала через xterm.js
- Обработка пользовательского ввода и горячих клавиш
- Динамическое переключение типов панелей (terminal / file-manager / agent)
- Автосохранение сессий

**Zustand stores:**
- `tab-store` — табы, layout-деревья, операции с панелями, сессии
- `settings-store` — настройки, активная тема, zoom
- `toast-store` — уведомления
- `file-manager-store` — per-pane состояние файлового менеджера

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

## Поток персистентности

```
Каждые 2с + beforeunload
        │
        ▼
  getSessionState()                 ← tab-store: собирает снимок
        │
        ├── Для каждого PTY: getCwd() (resolve текущий путь)
        ├── Зачищает terminalId (не выживают после перезагрузки)
        └── Собирает состояние файловых менеджеров
        │
        ▼
  window.api.session.save(snapshot) ← electron-store persists
        │
        ▼
  При следующем запуске:
  window.api.session.load()         ← восстанавливает табы + layout
```

## Принципы архитектуры

1. **Строгая изоляция** — renderer не имеет прямого доступа к Node.js API. Всё идёт через `contextBridge`.

2. **Fire-and-forget для ввода** — `pty:write` и `pty:resize` используют `send` (без ожидания ответа) для минимальной задержки.

3. **Invoke для создания** — `pty:create` использует `invoke` (с ответом), так как renderer нужен ID созданной сессии.

4. **Immutable state** — Zustand stores не мутируют состояние напрямую, всегда возвращают новый объект.

5. **Древовидный layout** — система панелей использует рекурсивное дерево `LayoutNode`, что позволяет неограниченную вложенность сплитов.

6. **Динамические типы панелей** — каждая панель может быть terminal, file-manager или agent. Тип переключается на лету.

7. **Централизованное управление терминалами** — `terminal-manager.ts` хранит реестр xterm-инстансов с attach/detach для переиспользования при переключении типов.
