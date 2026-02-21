# Быстрый старт

## Требования

- **Node.js** >= 18
- **npm** >= 9
- **Компилятор C++** для сборки `node-pty` (на Linux: `build-essential`, на macOS: Xcode Command Line Tools)
- **Python** >= 3.x (требуется `node-gyp` для компиляции нативных модулей)

## Установка

```bash
git clone <repo-url> terma
cd terma
npm install
```

При установке автоматически выполняется `postinstall`-скрипт, который пересобирает `node-pty` под текущую версию Electron:

```bash
electron-rebuild -f -w node-pty
```

Если пересборка не произошла автоматически:

```bash
npm run rebuild
```

## Запуск в режиме разработки

```bash
npm run dev
```

Это запустит:
1. Сборку main process (watch mode)
2. Сборку preload scripts (watch mode)
3. Vite dev server для renderer (HMR)
4. Electron-приложение

Renderer доступен на `http://localhost:5173/` (или следующий свободный порт).

### Linux: проблема с sandbox

На Linux может появиться ошибка `chrome-sandbox`. В проекте она решена через `app.commandLine.appendSwitch('no-sandbox')` в main process. Если проблема сохраняется, запустите:

```bash
ELECTRON_DISABLE_SANDBOX=1 npm run dev
```

## Сборка для production

```bash
npm run build
```

Собранные файлы окажутся в директории `out/`:
- `out/main/index.js` — main process
- `out/preload/index.js` — preload script
- `out/renderer/` — статические файлы renderer

## Превью собранного приложения

```bash
npm run preview
```

## Первый запуск

После запуска вы увидите:

1. **Titlebar** — кастомная панель заголовка с кнопками управления окном
2. **TabBar** — панель табов с одним начальным табом "Terminal"
3. **Терминал** — полноэкранный xterm.js, подключённый к вашему системному shell

Начинайте вводить команды — терминал полностью функционален.

### Попробуйте

- `Ctrl+Shift+T` — создать новый таб
- `Ctrl+Shift+D` — разделить панель вертикально
- `Ctrl+Shift+B` — показать/скрыть файловый менеджер
- `Ctrl+Shift+W` — закрыть текущий таб
