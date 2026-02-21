# Main Process

Main process — это Node.js процесс Electron, отвечающий за управление окнами, PTY-сессиями и доступ к файловой системе.

**Файл:** `src/main/index.ts`

## Точка входа

При запуске main process:

1. Устанавливает `--no-sandbox` флаг (решение проблемы chrome-sandbox на Linux)
2. Инициализирует синглтоны: `PtyManager`, `FsService`, `FsWatcher`
3. Дожидается `app.whenReady()`
4. Регистрирует все IPC-обработчики
5. Регистрирует обработчики управления окном (`window:minimize/maximize/close`)
6. Создаёт главное `BrowserWindow`

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
| `delete(filePath)` | Удаляет файл или директорию (рекурсивно) |

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

При любом изменении (add, change, unlink) отправляет в renderer:

```typescript
{ event: string, path: string, dirPath: string }
```

---

## Управление окном

Main process обрабатывает три IPC-сообщения для управления frameless окном:

| Канал | Действие |
|-------|----------|
| `window:minimize` | `win.minimize()` |
| `window:maximize` | Toggle: `maximize()` ↔ `unmaximize()` |
| `window:close` | `win.close()` |
