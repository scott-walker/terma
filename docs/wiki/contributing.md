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
2. Добавьте типы в IPC-контракт (`src/shared/ipc-types.ts` — `IpcInvokeMap`, `IpcSendMap` или `IpcEventMap`)
3. Создайте обработчик в `src/main/ipc/` (отдельный файл или добавьте в существующий)
4. Зарегистрируйте обработчик в `src/main/index.ts`
5. Добавьте метод в preload API (`src/preload/index.ts`)
6. Обновите типы в `src/renderer/src/types/electron.d.ts`

### Добавление нового Zustand store

1. Создайте файл в `src/renderer/src/stores/`
2. Экспортируйте хук `useXxxStore`
3. Используйте `create<StoreType>((set, get) => ({...}))` паттерн

### Добавление нового компонента

1. Создайте файл в соответствующей поддиректории `components/`
2. Используйте именованный экспорт (`export function Component`)
3. Стили — Tailwind utility classes (никаких CSS-классов, никаких hardcoded цветов)
4. Цвета — только из `@theme`-токенов (`bg-base`, `text-fg`, `border-border` и т.д.)

### Добавление нового типа панели

Текущие типы: `terminal`, `file-manager`, `agent`, `markdown`, `image`, `system-monitor`.

1. Добавьте значение в `PaneType` в `src/shared/types.ts`
2. Добавьте конфигурацию в `PANE_TYPE_CONFIGS` в `src/renderer/src/lib/pane-types.ts` (label + lucide icon)
3. Добавьте ветку рендеринга в `PaneContent.tsx`
4. При необходимости — обработчик в `terminal-manager.ts`
5. При необходимости — создайте компонент в `src/renderer/src/components/<type>/`

### Добавление новой темы

1. Добавьте объект `ThemePreset` в массив `PRESET_THEMES` в `src/shared/themes.ts`
2. Тема автоматически появится в панели настроек
3. `applyThemeToDOM()` автоматически сгенерирует UI-токены из новой палитры

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

#### In-app логи
StatusBar содержит кнопку копирования логов. Логи можно получить через `window.api.log.getLogs()` в DevTools console.

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

### PTY утечки

При закрытии таба все PTY в его layout-дереве должны быть уничтожены. Это обрабатывается в `tab-store.closeTab()` через `terminal-manager.destroy()`. Если PTY не уничтожаются — shell-процессы продолжают жить.

### ResizeObserver

При быстром ресайзе окна `fitAddon.fit()` может выбросить ошибку. Все вызовы обёрнуты в `try/catch` и выполняются через `requestAnimationFrame`.

### Session restore

При восстановлении сессии `terminalId` не переносится (PTY-процессы не выживают). Вместо этого восстанавливается `cwd` каждой панели, и новые PTY создаются с правильным рабочим каталогом.
