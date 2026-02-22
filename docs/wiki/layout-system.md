# Система layout

Система сплит-панелей построена на рекурсивной древовидной модели данных, вдохновлённой подходом Warp Terminal.

## Модель данных

**Файл:** `src/shared/types.ts`

Layout-дерево состоит из двух типов узлов:

```typescript
type PaneType = 'terminal' | 'file-manager' | 'agent' | 'markdown' | 'image' | 'system-monitor'

type LayoutNode = PaneNode | BranchNode

interface PaneNode {
  type: 'pane'
  id: string
  paneType: PaneType           // Тип содержимого панели
  terminalId: string | null    // ID PTY-сессии (для terminal/agent)
  cwd: string | null           // Рабочий каталог (для персистентности)
}

interface BranchNode {
  type: 'branch'
  id: string
  direction: 'horizontal' | 'vertical'
  children: LayoutNode[]       // 2+ дочерних узлов
  ratios: number[]             // Пропорции (50/50, 30/70 и т.д.)
}
```

### Типы панелей

**Файл:** `src/renderer/src/lib/pane-types.ts`

| Тип | Иконка | Описание |
|-----|--------|----------|
| `terminal` | Terminal | Обычный shell-терминал |
| `file-manager` | FolderOpen | Встроенный файловый менеджер |
| `agent` | Bot | Терминал для запуска AI-агента (agentCommand из настроек) |
| `markdown` | FileText | Просмотр Markdown-файлов (react-markdown) |
| `image` | Image | Просмотр изображений |
| `system-monitor` | Monitor | Метрики системы (CPU, RAM, диски) |

### Примеры деревьев

**Один терминал:**
```
PaneNode(id="a", paneType="terminal", terminalId="pty1")
```

**Вертикальный сплит (два терминала рядом):**
```
BranchNode(direction="vertical")
├── PaneNode(id="a", paneType="terminal")
└── PaneNode(id="b", paneType="terminal")
```

**Сложная компоновка с разными типами:**
```
BranchNode(direction="vertical")
├── PaneNode(id="a", paneType="terminal")
└── BranchNode(direction="horizontal")
    ├── PaneNode(id="b", paneType="agent")
    └── PaneNode(id="c", paneType="file-manager")
```

Визуально:
```
┌──────────┬──────────┐
│          │  Agent   │
│ Terminal ├──────────┤
│          │  Files   │
└──────────┴──────────┘
```

## Чистые функции

**Файл:** `src/renderer/src/lib/layout-tree.ts`

Все операции с деревом — чистые функции, не мутирующие входные данные.

### `createPane(paneType?)`

Создаёт новый PaneNode с уникальным ID (nanoid). По умолчанию `paneType: 'terminal'`.

```typescript
const pane = createPane()
// { type: 'pane', id: '...', paneType: 'terminal', terminalId: null, cwd: null }
```

### `splitNode(root, targetId, direction, paneType?)`

Разделяет указанную панель на две. Заменяет PaneNode на BranchNode с двумя дочерними узлами. Можно указать тип новой панели.

```typescript
const { tree, newPaneId } = splitNode(root, 'pane-a', 'vertical', 'file-manager')
```

**До:**
```
PaneNode(id="pane-a", paneType="terminal")
```

**После:**
```
BranchNode(direction="vertical", ratios=[50, 50])
├── PaneNode(id="pane-a", paneType="terminal")
└── PaneNode(id="new-pane", paneType="file-manager")
```

### `removeNode(root, targetId)`

Удаляет узел из дерева. Если у родительского BranchNode остаётся один ребёнок — схлопывает его (заменяет branch единственным ребёнком).

```typescript
const newTree = removeNode(root, 'pane-b')
```

**До:**
```
BranchNode
├── PaneNode(id="a")
└── PaneNode(id="b")    ← удаляем
```

**После:**
```
PaneNode(id="a")         ← branch схлопнут
```

Возвращает `null`, если дерево полностью пусто.

### `updateRatios(root, branchId, ratios)`

Обновляет пропорции конкретного branch-узла. Вызывается при ресайзе панелей.

```typescript
const newTree = updateRatios(root, 'branch-1', [30, 70])
```

### `findNode(root, nodeId)`

Находит узел в дереве по ID.

### `findParent(root, nodeId)`

Находит родительский BranchNode и индекс ребёнка.

### `getAllPaneIds(root)`

Возвращает список ID всех PaneNode в дереве. Используется при закрытии таба для уничтожения всех PTY.

### `setPaneTerminalId(root, paneId, terminalId)`

Устанавливает `terminalId` для конкретной панели.

### `setPaneType(root, paneId, paneType)`

Изменяет тип панели. При смене типа terminal-manager detach'ит текущий терминал.

### `swapPanes(root, paneId1, paneId2)`

Меняет местами содержимое двух панелей. Используется для drag-and-drop перестановки.

---

## Рендеринг

**Файл:** `src/renderer/src/components/layout/SplitPane.tsx`

Компонент `SplitPane` рекурсивно обходит layout-дерево:

```
SplitPane(node)
├── node.type === 'pane'   → <PaneWrapper>
│                              <PaneHeader />
│                              <PaneContent />
│                            </PaneWrapper>
└── node.type === 'branch' → <Group>
                                <Panel> <SplitPane child[0] /> </Panel>
                                <Separator />
                                <Panel> <SplitPane child[1] /> </Panel>
                              </Group>
```

`PaneContent` рендерит содержимое в зависимости от `paneType`:
- `terminal` → `Terminal` (xterm.js)
- `file-manager` → `FileManagerPane`
- `agent` → `Terminal` (с agentCommand)
- `markdown` → `MarkdownPane`
- `image` → `ImagePane`
- `system-monitor` → `SystemMonitorPane`

Используется `react-resizable-panels` (v4):
- `<Group direction={...}>` — контейнер (горизонтальный или вертикальный)
- `<Panel min="10%">` — панель с минимальным размером
- `<Separator>` — ручка ресайза между панелями

### PaneWrapper

Контейнер каждой панели (`PaneWrapper`) обеспечивает:
- Цветной бордюр активной панели (цвет берётся из CSS-переменной `--color-pane-active`)
- Drag-and-drop swap — перетаскивание панелей для перестановки
- Resize overlay — при перетаскивании разделителя показывает полупрозрачный оверлей над содержимым (решает проблему захвата мыши терминалом/iframe)

### Обратная связь ресайза

При изменении размеров панелей `react-resizable-panels` вызывает `onLayout` с массивом новых пропорций. Они сохраняются в store через `updateLayoutRatios()`.

### Активная панель

Каждый таб хранит `activePaneId`. При клике на панель (`onMouseDown`) обновляется активная панель. Активная панель получает фокус — xterm.js переключает focus и refit.

---

## Сплит-операции в Store

### Создание сплита

```
1. Пользователь нажимает Ctrl+Shift+D
2. App.tsx → splitPane(activeTabId, activePaneId, 'vertical')
3. tab-store → splitNode(layoutTree, paneId, direction)
4. layoutTree обновляется: PaneNode заменён на BranchNode
5. SplitPane перерисовывается, создаёт новый PaneWrapper
6. Terminal/FileManager монтируется в новой панели
```

### Создание сплита с типом

```
1. Пользователь нажимает Ctrl+Shift+B (файловый менеджер)
2. App.tsx → splitPaneWithType(activeTabId, activePaneId, 'horizontal', 'file-manager')
3. Новая панель создаётся с paneType='file-manager'
4. PaneContent рендерит FileManagerPane вместо Terminal
```

### Переключение типа панели

```
1. Пользователь нажимает Ctrl+Shift+A (toggle agent)
2. App.tsx → setPaneType(tabId, paneId, newType)
3. terminal-manager.detach(paneId) — xterm отключается от DOM
4. paneType обновляется в layout-дереве
5. PaneContent перерисовывается с новым типом
6. При возврате к terminal — terminal-manager.attach(paneId) переиспользует инстанс
```

### Закрытие панели

```
1. closePane(tabId, paneId)
2. terminal-manager.destroy(paneId)
3. removeNode(layoutTree, paneId)
4. Если дерево пустое → closeTab()
5. Если активная панель удалена → фокус на первую оставшуюся
6. SplitPane перерисовывается
```
