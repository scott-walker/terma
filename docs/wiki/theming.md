# Тема и стилизация

## Цветовая схема

Terma использует тему **Tokyo Night** — тёмную цветовую схему, популярную среди разработчиков.

### Палитра

| Назначение | Цвет | HEX |
|-----------|------|-----|
| Фон приложения | ![#1a1b26](https://via.placeholder.com/12/1a1b26/1a1b26) | `#1a1b26` |
| Фон titlebar/sidebar | ![#16161e](https://via.placeholder.com/12/16161e/16161e) | `#16161e` |
| Основной текст | ![#c0caf5](https://via.placeholder.com/12/c0caf5/c0caf5) | `#c0caf5` |
| Приглушённый текст | ![#a9b1d6](https://via.placeholder.com/12/a9b1d6/a9b1d6) | `#a9b1d6` |
| Неактивный текст | ![#565f89](https://via.placeholder.com/12/565f89/565f89) | `#565f89` |
| Акцент (синий) | ![#7aa2f7](https://via.placeholder.com/12/7aa2f7/7aa2f7) | `#7aa2f7` |
| Ошибка (красный) | ![#f7768e](https://via.placeholder.com/12/f7768e/f7768e) | `#f7768e` |
| Успех (зелёный) | ![#9ece6a](https://via.placeholder.com/12/9ece6a/9ece6a) | `#9ece6a` |
| Предупреждение (жёлтый) | ![#e0af68](https://via.placeholder.com/12/e0af68/e0af68) | `#e0af68` |
| Выделение | ![#33467c](https://via.placeholder.com/12/33467c/33467c) | `#33467c` |
| Бордюры | ![#414868](https://via.placeholder.com/12/414868/414868) | `#414868` |

### Терминальные цвета (ANSI)

Определены в `use-terminal.ts`:

| ANSI цвет | Обычный | Яркий |
|-----------|---------|-------|
| Black | `#15161e` | `#414868` |
| Red | `#f7768e` | `#f7768e` |
| Green | `#9ece6a` | `#9ece6a` |
| Yellow | `#e0af68` | `#e0af68` |
| Blue | `#7aa2f7` | `#7aa2f7` |
| Magenta | `#bb9af7` | `#bb9af7` |
| Cyan | `#7dcfff` | `#7dcfff` |
| White | `#a9b1d6` | `#c0caf5` |

## Tailwind CSS v4

Проект использует Tailwind CSS v4 с Vite-плагином.

### Подключение

```css
/* src/renderer/src/assets/main.css */
@import "tailwindcss";
```

Tailwind v4 использует директиву `@import` вместо `@tailwind` директив.

### Глобальные стили

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  overflow: hidden;
  background: #1a1b26;
  color: #c0caf5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

### Кастомный скроллбар

```css
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: #414868;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover { background: #565f89; }
```

## Кастомный Titlebar

Terma использует frameless-окно (`frame: false`) с кастомной панелью заголовка.

### Структура

```
┌─────────────────────────────────────────────┐
│  [Terma]                    [_] [□] [✕]     │
│  ← drag region →           ← no-drag →     │
└─────────────────────────────────────────────┘
```

- Вся панель — `WebkitAppRegion: 'drag'` (перетаскивание окна)
- Кнопки — `WebkitAppRegion: 'no-drag'` (кликабельные)
- Кнопка закрытия: hover фон `#f7768e` (красный)
- Остальные кнопки: hover фон `#1a1b26`

## Шрифты терминала

Настроены в `use-terminal.ts`:

```typescript
fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Menlo, monospace"
fontSize: 14
lineHeight: 1.2
cursorBlink: true
cursorStyle: 'bar'
```

Приоритет шрифтов:
1. JetBrains Mono
2. Cascadia Code
3. Fira Code
4. Menlo
5. Системный monospace

> Для лигатур требуется установленный шрифт с поддержкой лигатур (JetBrains Mono, Fira Code). Аддон `@xterm/addon-ligatures` подключён, но требует активации через настройки.

## Расширение темы

Для добавления новой цветовой схемы:

1. Создайте объект темы в `use-terminal.ts` (аналогично `THEME`)
2. Обновите фоновые цвета в CSS и компонентах
3. Обновите `backgroundColor` в `BrowserWindow` конфигурации

Запланировано: вынесение темы в конфигурационный файл, переключение тёмная/светлая тема.
