# Preload и IPC API

## Обзор

Preload-скрипт (`src/preload/index.ts`) создаёт безопасный мост между main и renderer process через `contextBridge`. Весь API доступен из renderer через `window.api`.

```typescript
window.api = {
  pty: PtyApi,           // Управление PTY-сессиями
  fs: FsApi,             // Работа с файловой системой
  settings: SettingsApi, // Настройки приложения
  session: SessionApi,   // Персистентность сессий
  shell: ShellApi,       // Системные операции
  clipboard: ClipboardApi, // Буфер обмена
  window: WindowApi,     // Управление окном
  whisper: WhisperApi,   // Голосовая транскрипция
  log: LogApi            // Логирование
}
```

## IPC-каналы

Определены в `src/shared/channels.ts` и используются обоими процессами.

### PTY-каналы

| Канал | Направление | Тип | Описание |
|-------|-------------|-----|----------|
| `pty:create` | renderer → main | `invoke` | Создание PTY, возвращает ID |
| `pty:write` | renderer → main | `send` | Отправка данных в PTY |
| `pty:resize` | renderer → main | `send` | Изменение размера PTY |
| `pty:destroy` | renderer → main | `send` | Уничтожение PTY |
| `pty:getCwd` | renderer → main | `invoke` | Получение текущего рабочего каталога |
| `pty:data` | main → renderer | event | Данные из PTY |
| `pty:exit` | main → renderer | event | PTY-процесс завершился |

### FS-каналы

| Канал | Направление | Тип | Описание |
|-------|-------------|-----|----------|
| `fs:readDir` | renderer → main | `invoke` | Чтение директории |
| `fs:stat` | renderer → main | `invoke` | Получение метаданных файла |
| `fs:rename` | renderer → main | `invoke` | Переименование |
| `fs:delete` | renderer → main | `invoke` | Удаление (в корзину) |
| `fs:restore` | renderer → main | `invoke` | Восстановление из корзины |
| `fs:copy` | renderer → main | `invoke` | Копирование файла/директории |
| `fs:copyProgress` | main → renderer | event | Прогресс копирования |
| `fs:watch` | renderer → main | `send` | Начать наблюдение за директорией |
| `fs:unwatch` | renderer → main | `send` | Прекратить наблюдение |
| `fs:event` | main → renderer | event | Изменение в файловой системе |

### Каналы настроек

| Канал | Направление | Тип | Описание |
|-------|-------------|-----|----------|
| `settings:get` | renderer → main | `invoke` | Получить текущие настройки |
| `settings:update` | renderer → main | `invoke` | Обновить настройки (partial) |
| `settings:reset` | renderer → main | `invoke` | Сбросить к значениям по умолчанию |
| `settings:changed` | main → renderer | event | Настройки изменились (broadcast) |

### Каналы сессий

| Канал | Направление | Тип | Описание |
|-------|-------------|-----|----------|
| `session:save` | renderer → main | `invoke` | Сохранить снимок сессии |
| `session:load` | renderer → main | `invoke` | Загрузить последнюю сессию |

### Каналы shell

| Канал | Направление | Тип | Описание |
|-------|-------------|-----|----------|
| `shell:openPath` | renderer → main | `invoke` | Открыть путь в файловом менеджере ОС |
| `shell:openWith` | renderer → main | `invoke` | Открыть файл указанной командой |

### Каналы буфера обмена

| Канал | Направление | Тип | Описание |
|-------|-------------|-----|----------|
| `clipboard:readFilePaths` | renderer → main | `invoke` | Прочитать пути файлов из буфера |
| `clipboard:saveImage` | renderer → main | `invoke` | Сохранить изображение из буфера |

### Каналы управления окном

| Канал | Направление | Тип | Описание |
|-------|-------------|-----|----------|
| `window:minimize` | renderer → main | `send` | Свернуть окно |
| `window:maximize` | renderer → main | `send` | Toggle maximize/unmaximize |
| `window:close` | renderer → main | `send` | Закрыть окно |
| `window:isMaximized` | renderer → main | `invoke` | Текущее состояние maximize |
| `window:maximized-change` | main → renderer | event | Смена состояния maximize |

### Каналы Whisper

| Канал | Направление | Тип | Описание |
|-------|-------------|-----|----------|
| `whisper:transcribe` | renderer → main | `invoke` | Транскрибировать аудио через OpenAI API |

### Каналы логирования

| Канал | Направление | Тип | Описание |
|-------|-------------|-----|----------|
| `log:getLogs` | renderer → main | `invoke` | Получить все логи из буфера |
| `log:onLog` | main → renderer | event | Новая запись в логе |

## Типы `invoke` vs `send`

- **`invoke`** (запрос-ответ) — используется когда renderer нужен результат: `pty:create` (нужен ID), `fs:readDir` (нужен список файлов), `settings:get` (нужны настройки)
- **`send`** (fire-and-forget) — используется когда ответ не нужен: `pty:write` (минимальная задержка ввода), `pty:resize`, `pty:destroy`, `fs:watch`

---

## PTY API

### `window.api.pty.create(opts?)`

Создаёт новую PTY-сессию.

```typescript
const ptyId = await window.api.pty.create({
  cols: 80,            // Опционально, по умолчанию 80
  rows: 24,            // Опционально, по умолчанию 24
  cwd: '/home/user',   // Опционально, по умолчанию $HOME
  command: 'claude',   // Опционально, произвольная команда (для agent)
  args: []             // Опционально, аргументы команды
})
```

**Возвращает:** `Promise<string>` — уникальный ID сессии (nanoid).

### `window.api.pty.write(id, data)`

Записывает данные в PTY. Не ждёт ответа.

```typescript
window.api.pty.write(ptyId, 'ls -la\n')
```

### `window.api.pty.resize(id, cols, rows)`

Обновляет размер PTY.

```typescript
window.api.pty.resize(ptyId, 120, 40)
```

### `window.api.pty.destroy(id)`

Убивает PTY-процесс.

```typescript
window.api.pty.destroy(ptyId)
```

### `window.api.pty.getCwd(id)`

Получает текущий рабочий каталог PTY.

```typescript
const cwd = await window.api.pty.getCwd(ptyId)
// '/home/user/projects' или null если PTY не найден
```

### `window.api.pty.onData(callback)`

Подписка на данные из PTY.

```typescript
const unsubscribe = window.api.pty.onData((id, data) => {
  if (id === myPtyId) {
    terminal.write(data)
  }
})

// Отписка
unsubscribe()
```

**Важно:** Callback вызывается для ВСЕХ PTY-сессий. Фильтрация по ID выполняется на стороне renderer.

**Возвращает:** `() => void` — функция отписки.

### `window.api.pty.onExit(callback)`

Подписка на завершение PTY-процесса.

```typescript
const unsubscribe = window.api.pty.onExit((id, exitCode, signal) => {
  console.log(`PTY ${id} exited with code ${exitCode}`)
})
```

---

## FS API

### `window.api.fs.readDir(dirPath)`

```typescript
const entries: FileEntry[] = await window.api.fs.readDir('/home/user/projects')
```

Возвращает массив `FileEntry`, отсортированный: директории первыми, затем алфавитно.

### `window.api.fs.stat(filePath)`

```typescript
const entry: FileEntry = await window.api.fs.stat('/home/user/file.txt')
```

### `window.api.fs.rename(oldPath, newPath)`

```typescript
await window.api.fs.rename('/old/path.txt', '/new/path.txt')
```

### `window.api.fs.delete(filePath)`

```typescript
await window.api.fs.delete('/path/to/file-or-dir')
```

Перемещает в корзину (trash). Для полного удаления используется рекурсивное удаление.

### `window.api.fs.restore(originalPaths)`

```typescript
const result = await window.api.fs.restore(['/path/to/file1', '/path/to/file2'])
// { ok: 2, fail: 0 }
```

Восстанавливает файлы из корзины (поддержка Linux).

### `window.api.fs.copy(srcPath, destDir)`

```typescript
await window.api.fs.copy('/path/to/source', '/path/to/dest-dir')
```

Копирует файл или директорию. Прогресс доступен через `onCopyProgress`.

### `window.api.fs.onCopyProgress(callback)`

```typescript
const unsubscribe = window.api.fs.onCopyProgress(({ done, total }) => {
  console.log(`${done}/${total} files copied`)
})
```

### `window.api.fs.watch(dirPath)` / `unwatch(dirPath)`

```typescript
window.api.fs.watch('/home/user/projects')
// ... позже
window.api.fs.unwatch('/home/user/projects')
```

### `window.api.fs.onFsEvent(callback)`

```typescript
const unsubscribe = window.api.fs.onFsEvent(({ event, path, dirPath }) => {
  // event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'
  console.log(`${event}: ${path} in ${dirPath}`)
})
```

---

## Settings API

### `window.api.settings.get()`

```typescript
const settings: TerminalSettings = await window.api.settings.get()
```

### `window.api.settings.update(partial)`

```typescript
const updated = await window.api.settings.update({ fontSize: 16 })
```

Обновляет только указанные поля. Возвращает полный объект настроек. Автоматически broadcast'ит изменения во все окна.

### `window.api.settings.reset()`

```typescript
const defaults = await window.api.settings.reset()
```

### `window.api.settings.onChanged(callback)`

```typescript
const unsubscribe = window.api.settings.onChanged((settings) => {
  // Настройки изменились (из другого окна или settings panel)
})
```

---

## Session API

### `window.api.session.save(state)` / `load()`

```typescript
// Сохранение
await window.api.session.save(sessionState)

// Загрузка
const state = await window.api.session.load()
// SessionState | null
```

---

## Shell API

```typescript
// Открыть директорию в системном файловом менеджере
await window.api.shell.openPath('/home/user/projects')

// Открыть файл указанной командой
await window.api.shell.openWith('code', '/path/to/file.ts')

// Путь к домашней директории (синхронный)
const home = window.api.shell.homePath
```

---

## Clipboard API

```typescript
// Прочитать пути файлов из буфера обмена
const paths = await window.api.clipboard.readFilePaths()

// Сохранить изображение из буфера в директорию
const savedPath = await window.api.clipboard.saveImage('/path/to/dest')
// string (путь) | null (если нет изображения)
```

---

## Window API

```typescript
window.api.window.minimize()  // Свернуть окно
window.api.window.maximize()  // Toggle maximize/unmaximize
window.api.window.close()     // Закрыть окно

// Текущее состояние maximize
const isMax = await window.api.window.isMaximized()

// Подписка на смену состояния
const unsubscribe = window.api.window.onMaximizedChange((maximized) => {
  // true/false
})
```

---

## Whisper API

```typescript
// Транскрибировать аудио (требуется OpenAI API key в настройках)
const text = await window.api.whisper.transcribe(audioBuffer)
```

Записывает аудио с микрофона через Web Audio API, отправляет в main process, который вызывает OpenAI Whisper API. Язык транскрипции настраивается в `settings.whisperLanguage`.

---

## Log API

```typescript
// Получить все логи из буфера (до 500 записей)
const logs: LogEntry[] = await window.api.log.getLogs()

// Подписка на новые записи
const unsubscribe = window.api.log.onLog((entry) => {
  // { timestamp, level, source, message, data? }
})
```

---

## Типизация

Типы для `window.api` объявлены в `src/renderer/src/types/electron.d.ts` через `declare global`. Это обеспечивает автодополнение в renderer-коде без явных импортов.

Общие типы данных (FileEntry, SessionState, LogEntry и др.) определены в `src/shared/types.ts` и используются обоими процессами.
