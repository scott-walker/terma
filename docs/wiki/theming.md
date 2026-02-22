# Тема и стилизация

## Цветовые темы

Terma поддерживает 4 встроенные цветовые темы. Тему можно переключить в панели настроек (`Ctrl+Shift+,`).

**Файл:** `src/shared/themes.ts`

| ID | Название |
|----|----------|
| `tokyo-night` | Tokyo Night (по умолчанию) |
| `dracula` | Dracula |
| `catppuccin-mocha` | Catppuccin Mocha |
| `one-dark` | One Dark |

Каждая тема определяет полный набор терминальных цветов (`ITheme` из xterm.js): background, foreground, cursor, selection, 8 ANSI цветов + 8 bright вариантов.

### Пример палитры (Tokyo Night)

| Назначение | HEX |
|-----------|-----|
| Фон | `#1a1b26` |
| Текст | `#c0caf5` |
| Курсор | `#c0caf5` |
| Выделение | `#33467c` |
| Red | `#f7768e` |
| Green | `#9ece6a` |
| Yellow | `#e0af68` |
| Blue | `#7aa2f7` |
| Magenta | `#bb9af7` |
| Cyan | `#7dcfff` |

## Система дизайн-токенов

### Поток

```
Пресет темы (themes.ts)  →  applyThemeToDOM()  →  CSS-переменные  →  @theme  →  Tailwind
     ITheme colors             App.tsx              :root vars       main.css    bg-*, text-*
```

### Динамическая генерация UI-токенов

При смене темы `applyThemeToDOM()` в `App.tsx` интерполирует цвета из терминальной палитры в CSS-переменные для UI:

```
Из пресета:           Генерируются:
─────────────         ────────────────
background       →    --color-base, --color-elevated, --color-surface, --color-surface-hover
foreground       →    --color-fg, --color-fg-secondary, --color-fg-muted
background + fg  →    --color-overlay-subtle, --color-overlay, --color-border, --color-border-hover
green            →    --color-accent
red              →    --color-danger
cyan             →    --color-info
yellow           →    --color-warning
blue             →    --color-directory
```

Поверхности (base → elevated → surface → surface-hover) создаются через `lighten()` от background. Текст (fg → fg-secondary → fg-muted) — через `mix()` между background и foreground.

### @theme токены в main.css

**Файл:** `src/renderer/src/assets/main.css`

CSS-файл содержит:
- **`@theme`** — семантические дизайн-токены, привязанные к CSS-переменным. Генерируют Tailwind-классы автоматически.
- **`@layer base`** — CSS-reset (body, scrollbar, focus-visible, selection, input)
- **Electron-specific** — `.drag-region` / `.no-drag-region`
- **Vendor-prefix** — `.text-gradient-logo`

### Примитивная палитра vs Семантические токены

```
:root (primitive palette)  →  @theme (semantic tokens)  →  Tailwind utilities (components)
     --palette-*                  --color-*                    bg-*, text-*, border-*
```

- Примитивные значения (`--palette-*`) определены в `:root` — НЕ доступны как Tailwind-классы
- Семантические токены (`--color-*`) определены в `@theme` — автоматически генерируют Tailwind-классы
- Компоненты используют ТОЛЬКО Tailwind-классы: `bg-base`, `text-fg`, `border-border` и т.д.

## Tailwind CSS v4

Проект использует Tailwind CSS v4 с Vite-плагином.

### Подключение

```css
/* src/renderer/src/assets/main.css */
@import "tailwindcss";
```

### Правила стилизации

- Все стили компонентов — Tailwind utility classes в JSX
- Никаких `!important` (включая Tailwind-модификатор `!`)
- Никаких hardcoded hex-цветов в компонентах — только `@theme`-токены
- Никаких CSS-классов для стилей, выразимых через Tailwind
- Новые цвета → сначала в `@theme`, затем через Tailwind

## Кастомный Titlebar

Terma использует frameless-окно (`frame: false`) с кастомной панелью заголовка.

### Структура

```
┌─────────────────────────────────────────────┐
│  [Terma]                    [_] [□] [✕]     │
│  ← drag region →           ← no-drag →     │
└─────────────────────────────────────────────┘
```

- Вся панель — `-webkit-app-region: drag` (перетаскивание окна)
- Кнопки — `-webkit-app-region: no-drag` (кликабельные)
- Кнопка закрытия: hover фон `bg-window-close` (красный)

При maximize окно теряет бордюры; при restore — получает `border-2 border-border`.

## Настройки стилей

Через панель настроек (`Ctrl+Shift+,`, вкладка Style) можно:
- Выбрать одну из 4 встроенных тем
- Просмотреть preview терминальных цветов

Через вкладку General:
- Шрифт терминала (по умолчанию `JetBrains Mono`)
- Размер шрифта (по умолчанию 14px)
- Высота строки (по умолчанию 1.2)
- Стиль курсора: bar / block / underline
- Мерцание курсора
- Scrollback (по умолчанию 10000)

### Zoom

Масштаб управляется через `Ctrl+=` / `Ctrl+-` / `Ctrl+0`:
- Эффективный размер шрифта: `fontSize + zoomLevel × 2`
- Диапазон zoomLevel: от -5 до +10

## Шрифты

Приоритет шрифтов терминала:
1. JetBrains Mono
2. Cascadia Code
3. Fira Code
4. Menlo
5. Системный monospace

UI использует шрифт Rajdhani для логотипа и системный sans-serif для остального интерфейса.
