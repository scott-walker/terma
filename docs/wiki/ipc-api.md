# Preload и IPC API

## Обзор

Preload-скрипт (`src/preload/index.ts`) создаёт безопасный мост между main и renderer process через `contextBridge`. Весь API доступен из renderer через `window.api`.

```typescript
window.api = {
  pty: PtyApi,       // Управление PTY-сессиями
  fs: FsApi,         // Работа с файловой системой
  window: WindowApi  // Управление окном
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
| `pty:data` | main → renderer | event | Данные из PTY |
| `pty:exit` | main → renderer | event | PTY-процесс завершился |

### FS-каналы

| Канал | Направление | Тип | Описание |
|-------|-------------|-----|----------|
| `fs:readDir` | renderer → main | `invoke` | Чтение директории |
| `fs:stat` | renderer → main | `invoke` | Получение метаданных файла |
| `fs:rename` | renderer → main | `invoke` | Переименование |
| `fs:delete` | renderer → main | `invoke` | Удаление |
| `fs:watch` | renderer → main | `send` | Начать наблюдение за директорией |
| `fs:unwatch` | renderer → main | `send` | Прекратить наблюдение |
| `fs:event` | main → renderer | event | Изменение в файловой системе |

### Каналы управления окном

| Канал | Направление | Тип |
|-------|-------------|-----|
| `window:minimize` | renderer → main | `send` |
| `window:maximize` | renderer → main | `send` |
| `window:close` | renderer → main | `send` |

## Типы `invoke` vs `send`

- **`invoke`** (запрос-ответ) — используется когда renderer нужен результат: `pty:create` (нужен ID), `fs:readDir` (нужен список файлов)
- **`send`** (fire-and-forget) — используется когда ответ не нужен: `pty:write` (минимальная задержка ввода), `pty:resize`, `pty:destroy`

---

## PTY API

### `window.api.pty.create(opts?)`

Создаёт новую PTY-сессию.

```typescript
const ptyId = await window.api.pty.create({
  cols: 80,        // Опционально, по умолчанию 80
  rows: 24,        // Опционально, по умолчанию 24
  cwd: '/home/user' // Опционально, по умолчанию $HOME
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

Удаление рекурсивное — для директорий удаляет всё содержимое.

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

## Window API

```typescript
window.api.window.minimize()  // Свернуть окно
window.api.window.maximize()  // Toggle maximize/unmaximize
window.api.window.close()     // Закрыть окно
```

---

## Типизация

Типы для `window.api` объявлены в `src/renderer/src/types/electron.d.ts` через `declare global`. Это обеспечивает автодополнение в renderer-коде без явных импортов.
