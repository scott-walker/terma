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
├──────┬──────────────────────────────┤
│ File │                              │
│ Mgr  │     SplitPane (active tab)   │
│      │                              │
└──────┴──────────────────────────────┘
```

Обязанности:
- Создание начального таба при первом рендере
- Глобальные обработчики горячих клавиш (подробнее: [Горячие клавиши](keyboard-shortcuts.md))
- Рендеринг layout-дерева активного таба

---

## Zustand Stores

Все stores используют `zustand` без middleware (immer доступен, но пока не задействован). Доступ к состоянию вне React-компонентов — через `store.getState()`.

### tab-store

**Файл:** `src/renderer/src/stores/tab-store.ts`

Центральный store приложения. Управляет табами и layout-деревьями.

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
  layoutTree: LayoutNode       // Дерево панелей (см. layout-system)
  activePaneId: string         // Активная панель в этом табе
}
```

#### Действия

| Действие | Описание |
|----------|----------|
| `createTab()` | Создаёт таб с одной панелью, делает его активным |
| `closeTab(id)` | Уничтожает все PTY в табе, удаляет из списка |
| `setActiveTab(id)` | Переключает активный таб |
| `setTitle(tabId, title)` | Устанавливает заголовок таба |
| `reorderTabs(from, to)` | Перемещает таб в списке |
| `splitPane(tabId, paneId, dir)` | Разделяет панель на две |
| `closePane(tabId, paneId)` | Закрывает панель, схлопывает branch если нужно |
| `setActivePaneId(tabId, paneId)` | Устанавливает активную панель |
| `updateLayoutRatios(tabId, branchId, ratios)` | Обновляет пропорции после ресайза |
| `setPaneTerminal(tabId, paneId, terminalId)` | Привязывает PTY к панели |

#### Логика закрытия таба

При закрытии таба обходит всё layout-дерево, находит все pane-узлы, вызывает `window.api.pty.destroy()` для каждого PTY. Затем:
- Удаляет таб из `tabs` и `tabOrder`
- Если закрыт активный таб — переключается на соседний (или `null` если табов больше нет)

### terminal-store

**Файл:** `src/renderer/src/stores/terminal-store.ts`

Реестр терминальных сессий. Хранит маппинг `id → { ptyId, title }`.

> На текущем этапе основная логика сессий живёт в `tab-store` через layout-дерево. `terminal-store` зарезервирован для расширения.

### file-manager-store

**Файл:** `src/renderer/src/stores/file-manager-store.ts`

#### Состояние

```typescript
{
  visible: boolean              // Показан ли файловый менеджер
  rootPath: string              // Корневая директория
  expandedDirs: Set<string>     // Раскрытые папки
}
```

#### Действия

| Действие | Описание |
|----------|----------|
| `toggle()` | Показать/скрыть панель |
| `setRootPath(path)` | Установить корневую директорию, сбросить раскрытие |
| `toggleDir(path)` | Раскрыть/свернуть директорию |
| `collapseDir(path)` | Свернуть директорию |

### workspace-store

**Файл:** `src/renderer/src/stores/workspace-store.ts`

#### Состояние

```typescript
{
  workspaces: Record<string, Workspace>
  workspaceOrder: string[]
  activeWorkspaceId: string | null
}
```

#### Интерфейс Workspace

```typescript
interface Workspace {
  id: string
  name: string
  cwd: string    // Рабочая директория workspace
}
```

---

## Компоненты

### TitleBar

**Файл:** `src/renderer/src/components/layout/TitleBar.tsx`

Кастомный titlebar для frameless-окна. Левая часть — логотип "Terma", правая — кнопки minimize/maximize/close.

Использует `-webkit-app-region: drag` для перетаскивания окна и `no-drag` для кнопок.

### TabBar

**Файл:** `src/renderer/src/components/layout/TabBar.tsx`

Горизонтальная панель табов. Рендерит `TabItem` для каждого таба из `tabOrder`. Кнопка "+" справа для создания нового таба.

### Tab

**Файл:** `src/renderer/src/components/layout/Tab.tsx`

Отдельный таб: текст заголовка + кнопка закрытия (появляется при hover).

Стили:
- Активный: фон `#1a1b26`, текст `#c0caf5`
- Неактивный: текст `#565f89`, hover — приглушённый фон

### SplitPane

**Файл:** `src/renderer/src/components/layout/SplitPane.tsx`

Рекурсивный компонент. Рендерит layout-дерево:
- `PaneNode` → рендерит `TerminalPane`
- `BranchNode` → рендерит `Group` + `Panel` + `Separator` из `react-resizable-panels`

Подробнее: [Система layout](layout-system.md)

### TerminalPane

**Файл:** `src/renderer/src/components/terminal/Terminal.tsx`

Обёртка для xterm.js. При монтировании:
1. Вызывает `window.api.pty.create()` — создаёт PTY
2. Записывает PTY ID в tab-store
3. Передаёт `containerRef` и `ptyId` в `useTerminal` хук
4. При размонтировании — уничтожает PTY

### useTerminal

**Файл:** `src/renderer/src/components/terminal/use-terminal.ts`

React-хук, инкапсулирующий всю логику xterm.js:
- Создание `Terminal` с настройками шрифта и темы
- Загрузка аддонов: FitAddon, WebGL/Canvas (с fallback), WebLinks, Unicode11
- Подписка на `window.api.pty.onData` (PTY → xterm)
- Подписка на `terminal.onData` (xterm → PTY)
- ResizeObserver для автоматического fit
- Focus/refit при активации таба
- Полная очистка при unmount

### FileManager, FileTree, FileItem

Боковая панель файлового менеджера. Подробнее: [Файловый менеджер](file-manager.md)

### WorkspaceBar

**Файл:** `src/renderer/src/components/layout/WorkspaceBar.tsx`

Панель переключения workspace. Отображается только при наличии более одного workspace.
