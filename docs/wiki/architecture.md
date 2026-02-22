# Обзор архитектуры

Terma следует стандартной модели Electron с тремя процессами, строгой изоляцией через `contextBridge` и однонаправленным потоком данных.

## Процессы

```
┌──────────────────────────────────────────────────────────────┐
│                        Main Process                           │
│                                                              │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────┐          │
│  │  PtyManager   │  │ FsService │  │  FsWatcher   │          │
│  │  (node-pty)   │  │(fs/promises)│ (chokidar)   │          │
│  └──────┬───────┘  └─────┬─────┘  └──────┬───────┘          │
│         │                │               │                   │
│  ┌──────┴───────┐  ┌─────┴─────┐  ┌──────┴───────┐          │
│  │SessionService│  │ Settings  │  │LoggerService │          │
│  │(electron-store)│ │ Service  │  │ (in-memory)  │          │
│  └──────┬───────┘  └─────┬─────┘  └──────┬───────┘          │
│         │                │               │                   │
│  ┌──────┴───────┐  ┌─────┴─────┐  ┌──────┴───────┐          │
│  │  GitService   │  │ SshService│  │  SysMonitor  │          │
│  │ (child_process)│ │  (ssh2)   │  │(systeminform)│          │
│  └──────┬───────┘  └─────┬─────┘  └──────┬───────┘          │
│         │                │               │                   │
│         └────────────────┼───────────────┘                   │
│                          │                                   │
│                    IPC Handlers                               │
│  (handlers, session, settings, whisper, log, ssh,            │
│   sysmon, translate, git)                                    │
└──────────────────────────┬───────────────────────────────────┘
                           │ ipcMain ↔ ipcRenderer
┌──────────────────────────┼───────────────────────────────────┐
│                    Preload Script                              │
│                                                              │
│               contextBridge.exposeInMainWorld                 │
│  window.api = { pty, fs, settings, session, shell,           │
│    clipboard, window, whisper, log, ssh, translate,           │
│    sysmon, selfmon, git }                                    │
└──────────────────────────┬───────────────────────────────────┘
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
- Git-интеграция (ветки, checkout, создание веток)
- SSH-подключения через ssh2
- Мониторинг системы (CPU, RAM, диски) через systeminformation
- Self-monitoring (ресурсы приложения: RSS, heap, CPU)
- Голосовая транскрипция через OpenAI Whisper API
- Перевод текста через OpenAI API
- In-memory логирование с broadcast в renderer

**Ключевые сервисы:**
- `PtyManager` — менеджер терминальных сессий (Map-based)
- `FsService` — асинхронные операции с файловой системой
- `FsWatcher` — наблюдение за изменениями через chokidar
- `SessionService` — сохранение/загрузка сессий (electron-store)
- `SettingsService` — настройки приложения (electron-store)
- `LoggerService` — in-memory буфер логов (до 500 записей) + broadcast
- `PlatformService` — платформо-зависимая логика
- `GitService` — получение информации о git-репозитории, ветки, checkout
- `SystemMonitorService` — метрики системы (CPU, RAM, диски)
- `SshService` — SSH-подключения через ssh2

Подробнее: [Main process](main-process.md)

## Preload Script

**Ответственность:**
- Безопасный мост между main и renderer через `contextBridge`
- Экспорт типизированного API в `window.api`
- Управление подписками на IPC-события (с корректной отпиской)

Preload предоставляет 14 API-групп:
- `window.api.pty` — создание/управление PTY-сессиями
- `window.api.fs` — операции с файловой системой
- `window.api.settings` — чтение/изменение настроек
- `window.api.session` — сохранение/загрузка сессий
- `window.api.shell` — открытие файлов/путей в системе
- `window.api.clipboard` — работа с буфером обмена
- `window.api.window` — управление окном
- `window.api.whisper` — голосовая транскрипция
- `window.api.log` — доступ к логам приложения
- `window.api.ssh` — SSH-подключения и навигация
- `window.api.translate` — перевод текста
- `window.api.sysmon` — метрики системы
- `window.api.selfmon` — ресурсы приложения (self-monitoring)
- `window.api.git` — Git-интеграция (ветки, checkout)

Подробнее: [Preload и IPC API](ipc-api.md)

## Renderer Process

**Ответственность:**
- UI на React с Tailwind CSS v4
- Управление состоянием через Zustand stores
- Рендеринг терминала через xterm.js
- Обработка пользовательского ввода и горячих клавиш
- Динамическое переключение типов панелей (terminal / file-manager / agent / markdown / image / system-monitor)
- Автосохранение сессий (каждые 10с + beforeunload)

**Zustand stores:**
- `tab-store` — табы, layout-деревья, операции с панелями, сессии
- `settings-store` — настройки, активная тема, zoom
- `toast-store` — уведомления
- `file-manager-store` — per-pane состояние файлового менеджера
- `agent-store` — per-pane привязка агент-профиля
- `ssh-store` — per-pane SSH-подключения

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
Каждые 10с + beforeunload
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

6. **Динамические типы панелей** — каждая панель может быть terminal, file-manager, agent, markdown, image или system-monitor. Тип переключается на лету.

7. **Централизованное управление терминалами** — `terminal-manager.ts` хранит реестр xterm-инстансов с attach/detach для переиспользования при переключении типов.
