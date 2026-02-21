# Руководство разработчика

## Настройка окружения

```bash
git clone <repo> terma && cd terma
npm install
npm run dev
```

## Архитектурные принципы

### Добавление нового IPC-канала

1. Объявите константу канала в `src/shared/channels.ts`
2. Добавьте обработчик в `src/main/ipc/handlers.ts`
3. Добавьте метод в preload API (`src/preload/index.ts`)
4. Обновите типы в `src/renderer/src/types/electron.d.ts`

### Добавление нового Zustand store

1. Создайте файл в `src/renderer/src/stores/`
2. Экспортируйте хук `useXxxStore`
3. Используйте `create<StoreType>((set, get) => ({...}))` паттерн

### Добавление нового компонента

1. Создайте файл в соответствующей поддиректории `components/`
2. Используйте именованный экспорт (`export function Component`)
3. Стили — Tailwind utility classes

## Процесс разработки

### Hot Module Replacement

В режиме `npm run dev`:
- **Renderer** — полный HMR через Vite. Изменения в React-компонентах применяются мгновенно
- **Main process** — автоматическая пересборка + перезапуск Electron
- **Preload** — автоматическая пересборка + reload renderer

### Отладка

#### Renderer (DevTools)
При запуске в dev-режиме доступны Chrome DevTools. Открываются через меню Electron или `Ctrl+Shift+I`.

#### Main process
Логи main process выводятся в терминал, из которого запущен `npm run dev`.

Для отладки с breakpoints:
```bash
# Запустить с inspect
npx electron-vite dev -- --inspect
```

#### node-pty
При проблемах с node-pty:
```bash
# Пересборка
npm run rebuild

# Проверка совместимости версии Electron
npx electron -v
```

## Ключевые зависимости

### node-pty

Нативный модуль, требующий компиляции. Пересобирается под конкретную версию Electron через `@electron/rebuild`.

**Проблемы:**
- Не компилируется → установите `build-essential` (Linux) или Xcode CLI Tools (macOS)
- Версия ABI не совпадает → `npm run rebuild`

### xterm.js v5

Addons совместимы с v5, но **не** с v6 (на момент разработки). При обновлении xterm проверяйте совместимость каждого аддона.

Установленные аддоны:
- `@xterm/addon-webgl` — GPU-ускоренный рендеринг
- `@xterm/addon-canvas` — fallback на Canvas2D
- `@xterm/addon-fit` — авторесайз терминала
- `@xterm/addon-search` — поиск по буферу
- `@xterm/addon-web-links` — кликабельные URL
- `@xterm/addon-serialize` — сериализация буфера
- `@xterm/addon-unicode11` — поддержка Unicode 11
- `@xterm/addon-ligatures` — лигатуры шрифтов

### react-resizable-panels v4

В v4 API изменился:
- `PanelGroup` → `Group`
- `PanelResizeHandle` → `Separator`
- `Panel` — тот же, но `defaultSize` и `minSize` принимают строки (`"10%"`)

## Известные особенности

### Linux sandbox

На Linux без правильно настроенного SUID sandbox Electron не запустится. Решение: `app.commandLine.appendSwitch('no-sandbox')` в main process.

### PTY утечки памяти

При закрытии таба все PTY в его layout-дереве должны быть уничтожены. Это обрабатывается в `tab-store.closeTab()`. Если PTY не уничтожаются — shell-процессы продолжают жить.

### ResizeObserver

При быстром ресайзе окна `fitAddon.fit()` может выбросить ошибку. Все вызовы обёрнуты в `try/catch` и выполняются через `requestAnimationFrame`.

## Дорожная карта

### Фаза 6 — Полировка

- [ ] Настройки через JSON-конфиг (шрифт, размер, тема, shell)
- [ ] Переключение тёмная/светлая тема
- [ ] Настраиваемые горячие клавиши
- [ ] Профили shell
- [ ] Drag-and-drop табов
- [ ] Навигация между панелями по Alt+Arrow
- [ ] Поиск в терминале (Ctrl+Shift+F)
- [ ] Контекстное меню файлового менеджера
- [ ] Персистентность workspace через electron-store
