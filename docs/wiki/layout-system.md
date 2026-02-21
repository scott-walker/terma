# Система layout

Система сплит-панелей построена на рекурсивной древовидной модели данных, вдохновлённой подходом Warp Terminal.

## Модель данных

**Файл:** `src/renderer/src/lib/layout-tree.ts`

Layout-дерево состоит из двух типов узлов:

```typescript
type LayoutNode = PaneNode | BranchNode

interface PaneNode {
  type: 'pane'
  id: string
  terminalId: string | null  // ID PTY-сессии
}

interface BranchNode {
  type: 'branch'
  id: string
  direction: 'horizontal' | 'vertical'
  children: LayoutNode[]     // 2+ дочерних узлов
  ratios: number[]           // Пропорции (50/50, 30/70 и т.д.)
}
```

### Примеры деревьев

**Один терминал:**
```
PaneNode(id="a", terminalId="pty1")
```

**Вертикальный сплит (два терминала рядом):**
```
BranchNode(direction="vertical")
├── PaneNode(id="a", terminalId="pty1")
└── PaneNode(id="b", terminalId="pty2")
```

**Сложная компоновка:**
```
BranchNode(direction="vertical")
├── PaneNode(id="a")
└── BranchNode(direction="horizontal")
    ├── PaneNode(id="b")
    └── PaneNode(id="c")
```

Визуально:
```
┌──────────┬──────────┐
│          │    b     │
│    a     ├──────────┤
│          │    c     │
└──────────┴──────────┘
```

## Чистые функции

Все операции с деревом — чистые функции, не мутирующие входные данные.

### `createPane(terminalId?)`

Создаёт новый PaneNode с уникальным ID (nanoid).

```typescript
const pane = createPane()  // { type: 'pane', id: '...', terminalId: null }
```

### `splitNode(root, targetId, direction)`

Разделяет указанную панель на две. Заменяет PaneNode на BranchNode с двумя дочерними узлами.

```typescript
const { tree, newPaneId } = splitNode(root, 'pane-a', 'vertical')
```

**До:**
```
PaneNode(id="pane-a")
```

**После:**
```
BranchNode(direction="vertical", ratios=[50, 50])
├── PaneNode(id="pane-a")        // Старая панель
└── PaneNode(id="new-pane")      // Новая панель
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

Устанавливает `terminalId` для конкретной панели. Вызывается когда TerminalPane создаёт PTY.

---

## Рендеринг

**Файл:** `src/renderer/src/components/layout/SplitPane.tsx`

Компонент `SplitPane` рекурсивно обходит layout-дерево:

```
SplitPane(node)
├── node.type === 'pane'   → <TerminalPane />
└── node.type === 'branch' → <Group>
                                <Panel> <SplitPane child[0] /> </Panel>
                                <Separator />
                                <Panel> <SplitPane child[1] /> </Panel>
                              </Group>
```

Используется `react-resizable-panels` (v4):
- `<Group direction={...}>` — контейнер (горизонтальный или вертикальный)
- `<Panel min="10%">` — панель с минимальным размером
- `<Separator>` — ручка ресайза между панелями

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
5. SplitPane перерисовывается, создаёт новый TerminalPane
6. TerminalPane создаёт новый PTY через window.api.pty.create()
```

### Закрытие панели

```
1. closePane(tabId, paneId)
2. removeNode(layoutTree, paneId)
3. Если дерево пустое → closeTab()
4. Если активная панель удалена → фокус на первую оставшуюся
5. SplitPane перерисовывается
6. TerminalPane размонтируется → PTY уничтожается
```
