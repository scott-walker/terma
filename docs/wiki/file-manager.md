# Файловый менеджер

Панель для навигации по файловой системе. Файловый менеджер — один из типов панелей (`paneType: 'file-manager'`), открывается через `Ctrl+Shift+B` как сплит или переключение типа панели.

## Архитектура

```
┌─ Renderer ──────────────────────────────┐
│                                          │
│  FileManagerPane (содержимое панели)     │
│  └── FileTree (виртуализированный список)│
│      └── FileItem × N (строки)           │
│          └── FileTypeIcon (иконка)       │
│                                          │
│  file-manager-store (Zustand, per-pane)  │
│  └── panes[paneId] = {rootPath, expanded}│
│                                          │
├─ IPC ────────────────────────────────────┤
│                                          │
│  window.api.fs.readDir()                 │
│  window.api.fs.watch() / unwatch()       │
│  window.api.fs.onFsEvent()              │
│  window.api.fs.rename()                  │
│  window.api.fs.delete()                  │
│  window.api.fs.copy()                    │
│  window.api.fs.restore()                 │
│  window.api.shell.openPath()             │
│  window.api.shell.openWith()             │
│                                          │
├─ Main Process ───────────────────────────┤
│                                          │
│  FsService → readdir, stat, rename, rm,  │
│              copy, restore (trash)        │
│  FsWatcher → chokidar watchers           │
│                                          │
└──────────────────────────────────────────┘
```

## Компоненты

### FileManagerPane

**Файл:** `src/renderer/src/components/file-manager/FileManagerPane.tsx`

Контейнер файлового менеджера внутри панели. Получает `paneId` для привязки к per-pane состоянию в store.

- Заголовок: имя корневой директории
- Содержимое: компонент `FileTree`
- Drag-and-drop: поддержка перетаскивания файлов (при drop на agent-панель файлы вставляются с `@`-префиксом)

### FileTree

**Файл:** `src/renderer/src/components/file-manager/FileTree.tsx`

Виртуализированное дерево файлов на основе `@tanstack/react-virtual`.

#### Загрузка данных

Использует рекурсивную функцию `loadDir(dirPath, depth)`:

1. Вызывает `window.api.fs.readDir(dirPath)` — получает список файлов
2. Фильтрует скрытые файлы (начинающиеся с `.`)
3. Для каждой раскрытой директории (`expandedDirs.has(path)`) — рекурсивно загружает содержимое
4. Формирует плоский массив `FlatEntry[]` для виртуализации

```typescript
interface FlatEntry {
  name: string       // Имя файла
  path: string       // Абсолютный путь
  isDirectory: boolean
  depth: number      // Глубина вложенности (для отступов)
}
```

#### Lazy loading

Содержимое директории загружается **только при раскрытии**. Это экономит ресурсы при работе с большими проектами.

#### Live-обновления

При монтировании `FileTree`:
1. Вызывает `window.api.fs.watch(rootPath)` — начинает наблюдение
2. Подписывается на `window.api.fs.onFsEvent()` — при любом изменении перезагружает дерево
3. При размонтировании — `unwatch()` + отписка

#### Виртуализация

Используется `@tanstack/react-virtual` с параметрами:
- `estimateSize: 28px` — высота одного элемента
- `overscan: 10` — предзагрузка 10 элементов сверху и снизу

Это обеспечивает плавный скролл даже для директорий с тысячами файлов.

### FileItem

**Файл:** `src/renderer/src/components/file-manager/FileItem.tsx`

Отдельная строка в дереве файлов.

**Визуальная структура:**
```
[отступ] [▶/▼ (если директория)] [иконка] [имя]
```

- Отступ: `depth × 16 + 8` пикселей
- Иконка: `FileTypeIcon` (по расширению файла или тип папки)
- Стрелка: `▶` (свёрнута) / `▼` (раскрыта), только для директорий

**События:**
- `onClick` — для директорий: toggle раскрытия
- Контекстное меню: переименование, удаление, открытие в системном менеджере

### FileTypeIcon

**Файл:** `src/renderer/src/components/file-manager/FileTypeIcon.tsx`

Иконки файлов по расширению. Использует SVG-иконки из набора file-type-icons.

## Store

**Файл:** `src/renderer/src/stores/file-manager-store.ts`

Per-pane состояние: каждая панель файлового менеджера имеет собственное состояние.

| Поле | Тип | Описание |
|------|-----|----------|
| `panes` | `Record<string, PaneState>` | Состояние каждой панели |

Каждый `PaneState`:

| Поле | Тип | Описание |
|------|-----|----------|
| `rootPath` | `string` | Корневой путь (по умолчанию `$HOME`) |
| `expandedDirs` | `Set<string>` | Множество путей раскрытых директорий |

| Действие | Описание |
|----------|----------|
| `getOrCreatePane(paneId)` | Получить или создать состояние для панели |
| `setRootPath(paneId, path)` | Установить корень, сбросить раскрытие |
| `toggleDir(paneId, path)` | Раскрыть/свернуть директорию |
| `removePane(paneId)` | Удалить состояние панели |

## Серверная часть

### FsService

- `readDir()` — читает директорию, сортирует (папки первыми, затем алфавитно)
- Пропускает файлы без доступа (graceful fallback)
- `rename()` — переименование
- `delete()` — удаление в корзину
- `restore()` — восстановление из корзины (Linux)
- `copy()` — копирование с прогрессом

### FsWatcher

- Один watcher на директорию (depth: 0 — только текущий уровень)
- `ignoreInitial: true` — не генерирует события для уже существующих файлов
- При удалении панели watchers автоматически отключаются

## Файловые ассоциации

В настройках можно определить файловые ассоциации — паттерн (glob) + команда для открытия. При двойном клике на файл, подходящий под паттерн, вызывается указанная команда через `shell:openWith`.
