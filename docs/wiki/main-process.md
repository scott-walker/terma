# Main Process

Main process — это Node.js процесс Electron, отвечающий за управление окнами, PTY-сессиями, файловой системой, настройками, сессиями и логированием.

**Файл:** `src/main/index.ts`

## Точка входа

При запуске main process:

1. Устанавливает `--no-sandbox` флаг (решение проблемы chrome-sandbox на Linux)
2. Инициализирует синглтоны: `PtyManager`, `FsService`, `FsWatcher`, `SessionService`, `SettingsService`, `LoggerService`
3. Дожидается `app.whenReady()`
4. Регистрирует все IPC-обработчики (разделены на модули)
5. Создаёт главное `BrowserWindow`

### Конфигурация окна

```typescript
new BrowserWindow({
  width: 1200,
  height: 800,
  minWidth: 400,
  minHeight: 300,
  frame: false,          // Frameless — кастомный titlebar
  titleBarStyle: 'hidden',
  backgroundColor: '#1a1b26',
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    sandbox: false       // Нужен для node-pty через preload
  }
})
```

### Жизненный цикл

- `window-all-closed` — уничтожает все PTY и watchers; на не-macOS завершает приложение
- `before-quit` — финальная очистка ресурсов
- `activate` (macOS) — создаёт новое окно, если все закрыты

---

## PtyManager

**Файл:** `src/main/pty/pty-manager.ts`

Управляет картой PTY-сессий (`Map<string, IPty>`). Каждая сессия привязана к конкретному `BrowserWindow` для отправки данных.

### API

| Метод | Описание |
|-------|----------|
| `create(id, win, opts?)` | Создаёт PTY-процесс и привязывает его к окну |
| `write(id, data)` | Записывает данные в PTY |
| `resize(id, cols, rows)` | Изменяет размер PTY |
| `destroy(id)` | Убивает PTY-процесс и удаляет из карты |
| `destroyAll()` | Уничтожает все сессии |
| `getCwd(id)` | Получает текущий рабочий каталог PTY |

### Создание PTY

```typescript
pty.spawn(shell, [], {
  name: 'xterm-256color',  // Тип терминала
  cols: opts.cols || 80,
  rows: opts.rows || 24,
  cwd: opts.cwd || process.env.HOME,
  env: process.env         // Наследует всё окружение
})
```

Поддерживается запуск произвольной команды через `opts.command` и `opts.args` (используется для agent-панелей).

Shell определяется из `process.env.SHELL`, fallback на `/bin/bash`.

### Обработка событий

При создании PTY подписываемся на два события:

- **`onData`** — данные от shell → `webContents.send('pty:data', id, data)` в renderer
- **`onExit`** — процесс завершился → удаляем из карты, уведомляем renderer через `'pty:exit'`

Оба обработчика проверяют `win.isDestroyed()` перед отправкой, чтобы избежать ошибок при закрытии окна.

### Защита от ошибок

`resize()` обёрнут в `try/catch` — при быстром ресайзе окна могут возникать ошибки, которые безопасно игнорировать.

---

## FsService

**Файл:** `src/main/file-system/fs-service.ts`

Асинхронный сервис для работы с файловой системой.

### API

| Метод | Описание |
|-------|----------|
| `readDir(dirPath)` | Читает содержимое директории, возвращает `FileEntry[]` |
| `stat(filePath)` | Получает метаданные файла |
| `rename(oldPath, newPath)` | Переименовывает/перемещает файл |
| `delete(filePath)` | Удаляет файл или директорию (перемещает в корзину) |
| `restore(originalPaths)` | Восстанавливает файлы из корзины (Linux) |
| `copy(srcPath, destDir)` | Копирует файл/директорию с прогрессом |

### FileEntry

```typescript
interface FileEntry {
  name: string        // Имя файла
  path: string        // Абсолютный путь
  isDirectory: boolean
  isSymlink: boolean
  size: number        // Размер в байтах
  modified: number    // Время изменения (ms)
}
```

### Сортировка

`readDir` возвращает результаты отсортированными:
1. Директории первыми
2. Внутри каждой группы — алфавитно по имени

### Обработка ошибок

Файлы, к которым нет доступа (permission denied), тихо пропускаются в `readDir`, вместо того чтобы прерывать чтение всей директории.

### Копирование с прогрессом

`copy()` поддерживает рекурсивное копирование директорий. Прогресс отправляется в renderer через канал `fs:copyProgress` в формате `{ done, total }`.

---

## FsWatcher

**Файл:** `src/main/file-system/fs-watcher.ts`

Наблюдение за изменениями файловой системы через chokidar.

### API

| Метод | Описание |
|-------|----------|
| `watch(dirPath, win)` | Начать наблюдение за директорией |
| `unwatch(dirPath)` | Прекратить наблюдение |
| `unwatchAll()` | Прекратить все наблюдения |

### Конфигурация chokidar

```typescript
watch(dirPath, {
  depth: 0,                  // Только текущий уровень, не рекурсивно
  ignoreInitial: true,       // Не стрелять событиями на уже существующие файлы
  ignorePermissionErrors: true
})
```

Наблюдение ведётся только за теми директориями, которые пользователь раскрыл в файловом менеджере. Это экономит ресурсы.

### События

При любом изменении (add, change, unlink, addDir, unlinkDir) отправляет в renderer:

```typescript
{ event: string, path: string, dirPath: string }
```

---

## SessionService

**Файл:** `src/main/sessions/session-service.ts`

Персистентность сессий через `electron-store`.

### API

| Метод | Описание |
|-------|----------|
| `save(state)` | Сохраняет снимок сессии |
| `load()` | Загружает последнюю сессию (или `null`) |

### Формат SessionState

```typescript
interface SessionState {
  tabs: Record<string, TabSnapshot>
  tabOrder: string[]
  activeTabId: string | null
  fileManagerPanes: Record<string, { rootPath: string; expandedDirs: string[] }>
}
```

---

## SettingsService

Персистентность настроек через `electron-store`.

### API

| Метод | Описание |
|-------|----------|
| `get()` | Получить текущие настройки |
| `update(partial)` | Обновить часть настроек, broadcast всем окнам |
| `reset()` | Сбросить к значениям по умолчанию |

При обновлении настроек автоматически отправляет `settings:changed` во все окна для синхронизации.

---

## LoggerService

**Файл:** `src/main/services/logger-service.ts`

In-memory буфер логов с broadcast в renderer.

- Хранит до **500 записей** (MAX_ENTRIES)
- Каждая запись: `{ timestamp, level, source, message, data? }`
- Уровни: `debug`, `info`, `warn`, `error`
- При добавлении новой записи автоматически отправляет её во все открытые окна через `log:onLog`
- Renderer может запросить все логи через `log:getLogs`

---

## PlatformService

**Файл:** `src/main/services/platform-service.ts`

Платформо-зависимая логика для Linux, macOS и Windows: определение путей к корзине, открытие файлов в системных приложениях и др.

---

## GitService

**Файл:** `src/main/services/git-service.ts`

Интеграция с Git через `child_process.execFile`. Все команды выполняются с таймаутом 3 секунды.

### Экспортируемые функции

| Функция | Описание |
|---------|----------|
| `getGitInfo(cwd)` | Возвращает `{ repo, branch, url }` или `null` если не git-репо |
| `listBranches(cwd)` | Список локальных и remote веток, отсортированных по committerdate |
| `checkoutBranch(cwd, branch)` | Переключение на ветку (с автосозданием tracking для remote) |
| `createBranch(cwd, name)` | Создание новой ветки (`git checkout -b name`) |

### Обработка remote URL

`remoteToHttps()` конвертирует SSH-формат (`git@github.com:user/repo.git`) и HTTPS-формат в чистый HTTPS URL для отображения в UI.

---

## SystemMonitorService

**Файл:** `src/main/services/system-monitor-service.ts`

Сбор системных метрик через библиотеку `systeminformation`.

### API

| Метод | Описание |
|-------|----------|
| `getMetrics()` | Собирает полный набор системных метрик |

### SystemMetrics

```typescript
interface SystemMetrics {
  processCount: number
  ram: { total: number; used: number; free: number; usedPercent: number }
  cpu: { cores: number; model: string; avgLoad: number; coreLoads: CpuCoreLoad[] }
  disks: DiskInfo[]
}
```

Метрики собираются параллельно через `Promise.all`: `currentLoad`, `mem`, `fsSize`, `processes`, `cpu`.

---

## SshService

**Файл:** `src/main/ssh/ssh-service.ts`

SSH-подключения через библиотеку `ssh2`. Поддерживает множественные одновременные подключения.

### API

| Метод | Описание |
|-------|----------|
| `connect(profile)` | Подключение к SSH-серверу по профилю |
| `disconnect(profileId)` | Отключение от сервера |
| `readDir(profileId, remotePath)` | Чтение удалённой директории через SFTP |
| `getHomeDir(profileId)` | Получение домашней директории на удалённом сервере |
| `isConnected(profileId)` | Проверка состояния подключения |
| `disconnectAll()` | Отключение всех подключений (при закрытии приложения) |

### Особенности

- **Таймауты**: connect — 10с, SFTP-операции — 15с
- **LRU-кэш директорий**: до 20 записей, TTL 10с. Инвалидируется при отключении.
- **Автоочистка**: при неожиданном закрытии соединения — автоматическое удаление из карты и инвалидация кэша.
- **Аутентификация**: по SSH-ключу (поддержка `~` в пути к ключу)

### SshProfile

```typescript
interface SshProfile {
  id: string
  name: string
  host: string
  port: number
  username: string
  keyPath: string
  defaultPath: string
}
```

---

## Управление окном

Main process обрабатывает IPC-сообщения для управления frameless окном:

| Канал | Действие |
|-------|----------|
| `window:minimize` | `win.minimize()` |
| `window:maximize` | Toggle: `maximize()` ↔ `unmaximize()` |
| `window:close` | `win.close()` (инициирует подтверждение закрытия) |
| `window:force-close` | Принудительное закрытие без подтверждения |
| `window:confirm-close` | Событие: main → renderer, запрос подтверждения закрытия |
| `window:isMaximized` | Возвращает текущее состояние maximize |
| `window:maximized-change` | Событие при смене состояния maximize |

При нажатии `window:close` main process отправляет `window:confirm-close` в renderer вместо немедленного закрытия. Renderer показывает `ConfirmDialog`, и при подтверждении вызывает `window:force-close`.

При смене состояния maximize/unmaximize отправляет событие в renderer для обновления UI (бордюры окна видны только в не-maximize режиме).
