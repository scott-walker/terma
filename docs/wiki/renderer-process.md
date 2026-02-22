# Renderer Process

Renderer — React-приложение, отвечающее за весь UI. Работает в Chromium-контексте без прямого доступа к Node.js.

## Entry point

**Файл:** `src/renderer/src/main.tsx`

```typescript
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

## App — корневой компонент

**Файл:** `src/renderer/src/App.tsx`

Структура UI:

```
┌─────────────────────────────────────┐
│            TitleBar                  │
├─────────────────────────────────────┤
│            TabBar                    │
├─────────────────────────────────────┤
│                                     │
│     SplitPane (active tab)          │
│     ┌─────────┬─────────┐          │
│     │ Terminal │  Agent  │          │
│     │         ├─────────┤          │
│     │         │  Files  │          │
│     └─────────┴─────────┘          │
│                                     │
├─────────────────────────────────────┤
│            StatusBar                 │
└─────────────────────────────────────┘
         + SettingsPanel (overlay)
         + ToastContainer
         + ConfirmDialog
```

Обязанности:
- Загрузка настроек и подписка на их изменения
- Загрузка сохранённой сессии или создание начального таба
- Автосохранение сессии каждые 2 секунды + на `beforeunload`
- Применение цветовой темы к DOM (`applyThemeToDOM`)
- Глобальные обработчики горячих клавиш (подробнее: [Горячие клавиши](keyboard-shortcuts.md))
- Отслеживание состояния maximize/unmaximize для бордюров окна

### TabContent (memo)

Каждый таб рендерится через мемоизированный `TabContent`. Неактивные табы получают `invisible pointer-events-none` вместо `display: none` — это сохраняет xterm-инстансы в DOM и предотвращает потерю буфера.

---

## Zustand Stores

### tab-store

**Файл:** `src/renderer/src/stores/tab-store.ts`

Центральный store приложения. Управляет табами, layout-деревьями и сессиями.

#### Состояние

```typescript
{
  tabs: Record<string, Tab>     // Все табы по ID
  tabOrder: string[]            // Порядок отображения
  activeTabId: string | null    // Текущий активный таб
}
```

#### Интерфейс Tab

```typescript
interface Tab {
  id: string
  title: string
  color: string | null          // Цвет таба (red, orange, yellow, green, blue, purple)
  layoutTree: LayoutNode        // Дерево панелей (см. layout-system)
  activePaneId: string          // Активная панель в этом табе
}
```

#### Действия

| Действие | Описание |
|----------|----------|
| `createTab()` | Создаёт таб с одной панелью, делает его активным |
| `closeTab(id)` | Уничтожает все PTY в табе, удаляет из списка |
| `setActiveTab(id)` | Переключает активный таб |
| `setTitle(tabId, title)` | Устанавливает заголовок таба |
| `setTabColor(tabId, color)` | Устанавливает цвет таба |
| `reorderTabs(from, to)` | Перемещает таб в списке |
| `splitPane(tabId, paneId, dir)` | Разделяет панель на две |
| `splitPaneWithType(tabId, paneId, dir, type)` | Разделяет с указанием типа новой панели |
| `closePane(tabId, paneId)` | Закрывает панель, схлопывает branch если нужно |
| `setActivePaneId(tabId, paneId)` | Устанавливает активную панель |
| `setPaneType(tabId, paneId, type)` | Переключает тип панели (terminal/agent/file-manager) |
| `updateLayoutRatios(tabId, branchId, ratios)` | Обновляет пропорции после ресайза |
| `setPaneTerminal(tabId, paneId, terminalId)` | Привязывает PTY к панели |
| `swapPanes(tabId, paneId1, paneId2)` | Меняет местами две панели (drag-drop) |
| `getSessionState()` | Создаёт снимок для персистентности |
| `restoreSession(state)` | Восстанавливает сессию из снимка |

#### Логика закрытия таба

При закрытии таба обходит всё layout-дерево, находит все pane-узлы, вызывает `terminal-manager.destroy()` для каждого PTY. Затем:
- Удаляет таб из `tabs` и `tabOrder`
- Если закрыт активный таб — переключается на соседний (или `null` если табов больше нет)

Если в табе больше одной панели — перед закрытием показывается `ConfirmDialog`.

### settings-store

**Файл:** `src/renderer/src/stores/settings-store.ts`

Управляет настройками приложения и темой.

#### Состояние

```typescript
{
  settings: TerminalSettings    // Текущие настройки
  settingsOpen: boolean         // Открыта ли панель настроек
}
```

#### Действия

| Действие | Описание |
|----------|----------|
| `loadSettings()` | Загружает настройки из main process |
| `updateSettings(partial)` | Обновляет настройки (отправляет в main) |
| `resetSettings()` | Сбросить к значениям по умолчанию |
| `toggleSettings()` | Показать/скрыть панель настроек |
| `getActiveTheme()` | Получить активный пресет темы |
| `zoomIn()` / `zoomOut()` / `zoomReset()` | Управление масштабом |

### toast-store

**Файл:** `src/renderer/src/stores/toast-store.ts`

Управляет уведомлениями (toast notifications).

#### Действия

| Действие | Описание |
|----------|----------|
| `addToast(type, message)` | Показать уведомление (error, success, info) |
| `removeToast(id)` | Убрать уведомление |

### file-manager-store

**Файл:** `src/renderer/src/stores/file-manager-store.ts`

Per-pane состояние файлового менеджера. Хранит отдельное состояние для каждой панели типа `file-manager`.

#### Состояние

```typescript
{
  panes: Record<string, {
    rootPath: string            // Корневой путь
    expandedDirs: Set<string>   // Раскрытые папки
  }>
}
```

#### Действия

| Действие | Описание |
|----------|----------|
| `getOrCreatePane(paneId)` | Получить/создать состояние для панели |
| `setRootPath(paneId, path)` | Установить корневую директорию |
| `toggleDir(paneId, path)` | Раскрыть/свернуть директорию |
| `removePane(paneId)` | Удалить состояние панели |

---

## terminal-manager.ts

**Файл:** `src/renderer/src/lib/terminal-manager.ts`

Центральный реестр xterm.Terminal инстансов. Не является React-компонентом — это чистый Map-based менеджер.

### Ключевые операции

| Метод | Описание |
|-------|----------|
| `attach(paneId, container, opts)` | Создаёт или переиспользует терминал для контейнера + запускает PTY |
| `detach(paneId)` | Отключает терминал из DOM, но сохраняет инстанс |
| `destroy(paneId)` | Убивает PTY и удаляет терминал |

### Attach/Detach паттерн

При переключении типа панели (terminal → agent → terminal) терминал **detach'ится** из DOM, но остаётся в реестре. При возвращении обратно — **attach'ится** в новый контейнер без пересоздания. Это сохраняет буфер терминала.

Для agent-панелей используется отдельный ключ: `paneId + ':agent'`.

---

## Компоненты

### TitleBar

**Файл:** `src/renderer/src/components/layout/TitleBar.tsx`

Кастомный titlebar для frameless-окна. Левая часть — логотип "Terma", правая — кнопки minimize/maximize/close (компонент `WindowControls`).

Использует `-webkit-app-region: drag` для перетаскивания окна и `no-drag` для кнопок.

### TabBar

**Файл:** `src/renderer/src/components/layout/TabBar.tsx`

Горизонтальная панель табов. Рендерит `TabItem` для каждого таба из `tabOrder`. Поддерживает drag-reorder табов. Кнопки: "+" для нового таба, шестерёнка для настроек.

Контекстное меню таба: переименование, выбор цвета, закрытие.

### PaneHeader

**Файл:** `src/renderer/src/components/layout/PaneHeader.tsx`

Заголовок каждой панели. Содержит:
- Иконка и название типа панели
- Кнопка split (вертикальный/горизонтальный)
- Кнопка микрофона (Whisper транскрипция, при наличии OpenAI API key)
- Кнопка закрытия панели

### PaneContent

**Файл:** `src/renderer/src/components/layout/PaneContent.tsx`

Условный рендер содержимого панели в зависимости от `paneType`:
- `terminal` → `Terminal` (xterm.js)
- `file-manager` → `FileManagerPane`
- `agent` → `Terminal` (с отдельным PTY для agentCommand)

### PaneWrapper

**Файл:** `src/renderer/src/components/layout/PaneWrapper.tsx`

Контейнер одной панели:
- Цветной бордюр для активной панели
- Drag-and-drop swap панелей в пределах таба
- Resize overlay — полупрозрачный оверлей при перетаскивании разделителя (предотвращает захват мыши iframe/терминалом)

### SplitPane

**Файл:** `src/renderer/src/components/layout/SplitPane.tsx`

Рекурсивный компонент. Рендерит layout-дерево:
- `PaneNode` → `PaneWrapper` → `PaneHeader` + `PaneContent`
- `BranchNode` → `Group` + `Panel` + `Separator` из `react-resizable-panels`

Подробнее: [Система layout](layout-system.md)

### StatusBar

**Файл:** `src/renderer/src/components/layout/StatusBar.tsx`

Нижняя статусная строка: текущий рабочий каталог, количество панелей, кнопка копирования логов.

### SettingsPanel

**Файл:** `src/renderer/src/components/settings/SettingsPanel.tsx`

Боковая панель настроек с двумя вкладками:
- **General** — agentCommand, шрифт, размер, scrollback, курсор, файловые ассоциации, OpenAI API key, язык Whisper
- **Style** — выбор темы (4 пресета), preview терминальных цветов

### Terminal

**Файл:** `src/renderer/src/components/terminal/Terminal.tsx`

React-обёртка для xterm.js. При монтировании вызывает `terminal-manager.attach()`, при размонтировании — `detach()`. Получает `paneId` и `isActive` для управления фокусом.

### FileManagerPane, FileTree, FileItem, FileTypeIcon

Панель файлового менеджера. Подробнее: [Файловый менеджер](file-manager.md)
