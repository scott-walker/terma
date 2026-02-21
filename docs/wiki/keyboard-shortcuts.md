# Горячие клавиши

Все сочетания обрабатываются в `App.tsx` через глобальный `keydown` listener.

## Управление табами

| Сочетание | Действие |
|-----------|----------|
| `Ctrl+Shift+T` | Создать новый таб |
| `Ctrl+Shift+W` | Закрыть активный таб |
| `Ctrl+Shift+1` | Переключиться на 1-й таб |
| `Ctrl+Shift+2` | Переключиться на 2-й таб |
| `Ctrl+Shift+3`...`9` | Переключиться на N-й таб |

## Сплит-панели

| Сочетание | Действие |
|-----------|----------|
| `Ctrl+Shift+D` | Разделить активную панель вертикально (бок о бок) |
| `Ctrl+Shift+E` | Разделить активную панель горизонтально (сверху/снизу) |

## Файловый менеджер

| Сочетание | Действие |
|-----------|----------|
| `Ctrl+Shift+B` | Показать/скрыть файловый менеджер |

## Управление окном

Кнопки в titlebar:
- Свернуть (minimize)
- Развернуть / восстановить (maximize toggle)
- Закрыть окно (close)

## Запланированные сочетания

Ещё не реализованы:

| Сочетание | Действие |
|-----------|----------|
| `Alt+Arrow` | Навигация между сплит-панелями |
| `Ctrl+Shift+F` | Поиск в терминале |

## Реализация

Обработчик определён в `App.tsx`:

```typescript
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  const { ctrlKey, shiftKey, key } = e
  const state = useTabStore.getState()

  if (ctrlKey && shiftKey) {
    switch (key) {
      case 'T': createTab(); break
      case 'W': closeTab(activeTabId); break
      case 'D': splitPane(..., 'vertical'); break
      case 'E': splitPane(..., 'horizontal'); break
      case 'B': toggleFileManager(); break
    }
    // + переключение табов 1-9
  }
}, [...])
```

Все сочетания используют `e.preventDefault()` для предотвращения стандартных действий браузера.

Состояние читается через `useTabStore.getState()` (не из React state), чтобы обработчик всегда имел актуальные данные без необходимости пересоздания.
