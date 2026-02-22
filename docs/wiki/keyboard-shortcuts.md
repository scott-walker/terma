# Горячие клавиши

Все сочетания обрабатываются в `App.tsx` через глобальный `keydown` listener. Используется `e.code` для буквенных клавиш, что обеспечивает работу независимо от раскладки клавиатуры.

## Управление табами

| Сочетание | Действие |
|-----------|----------|
| `Ctrl+Shift+T` | Создать новый таб |
| `Ctrl+Shift+W` | Закрыть активный таб (с подтверждением, если несколько панелей) |
| `Ctrl+Shift+1` | Переключиться на 1-й таб |
| `Ctrl+Shift+2` | Переключиться на 2-й таб |
| `Ctrl+Shift+3`...`9` | Переключиться на N-й таб |

## Сплит-панели

| Сочетание | Действие |
|-----------|----------|
| `Ctrl+Shift+D` | Разделить активную панель вертикально (бок о бок) |
| `Ctrl+Shift+E` | Разделить активную панель горизонтально (сверху/снизу) |
| `Ctrl+Shift+B` | Разделить + открыть файловый менеджер (горизонтально) |
| `Ctrl+Shift+A` | Переключить тип панели: terminal ↔ agent |

## Масштаб

| Сочетание | Действие |
|-----------|----------|
| `Ctrl+=` / `Ctrl++` | Увеличить масштаб |
| `Ctrl+-` | Уменьшить масштаб |
| `Ctrl+0` | Сбросить масштаб |

## Настройки

| Сочетание | Действие |
|-----------|----------|
| `Ctrl+Shift+,` | Открыть/закрыть панель настроек |

## Управление окном

Кнопки в titlebar:
- Свернуть (minimize)
- Развернуть / восстановить (maximize toggle)
- Закрыть окно (close)

## Реализация

Обработчик определён в `App.tsx`:

```typescript
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  const { ctrlKey, shiftKey, code, key } = e

  // Zoom: Ctrl+= / Ctrl+- / Ctrl+0 (без Shift)
  if (ctrlKey && !shiftKey) {
    if (key === '=' || key === '+') { zoomIn(); return }
    if (key === '-') { zoomOut(); return }
    if (key === '0') { zoomReset(); return }
  }

  if (ctrlKey && shiftKey) {
    // Settings: Ctrl+Shift+,
    if (key === '<' || key === ',' || code === 'Comma') {
      toggleSettings(); return
    }

    // Используем e.code для букв (layout-independent)
    switch (code) {
      case 'KeyT': createTab(); break
      case 'KeyW': closeTab(activeTabId); break
      case 'KeyD': splitPane(..., 'vertical'); break
      case 'KeyE': splitPane(..., 'horizontal'); break
      case 'KeyB': splitPaneWithType(..., 'horizontal', 'file-manager'); break
      case 'KeyA': toggleAgentType(); break
    }

    // Переключение табов 1-9
    if (key >= '1' && key <= '9') {
      setActiveTab(tabOrder[parseInt(key) - 1])
    }
  }
}, [])
```

Все сочетания используют `e.preventDefault()` для предотвращения стандартных действий браузера.

Состояние читается через `useTabStore.getState()` и `useSettingsStore.getState()` (не из React state), чтобы обработчик всегда имел актуальные данные без необходимости пересоздания.
