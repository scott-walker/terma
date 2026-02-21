# Структура проекта

```
terma/
├── package.json                    # Зависимости, скрипты
├── tsconfig.json                   # Корневой TS конфиг (project references)
├── tsconfig.node.json              # TS конфиг для main + preload
├── tsconfig.web.json               # TS конфиг для renderer
├── electron.vite.config.ts         # Конфигурация electron-vite
├── docs/
│   └── wiki/                       # Документация (эта вики)
├── out/                            # Собранные файлы (gitignore)
├── resources/                      # Статические ресурсы (иконки и т.д.)
└── src/
    ├── shared/                     # Код, общий для main и renderer
    │   └── channels.ts             # Константы IPC-каналов
    ├── main/                       # Electron main process
    │   ├── index.ts                # Entry point: создание окна, регистрация IPC
    │   ├── pty/
    │   │   └── pty-manager.ts      # Менеджер PTY-сессий
    │   ├── file-system/
    │   │   ├── fs-service.ts       # Операции с файловой системой
    │   │   └── fs-watcher.ts       # Наблюдение за файлами (chokidar)
    │   └── ipc/
    │       └── handlers.ts         # Регистрация всех ipcMain обработчиков
    ├── preload/
    │   └── index.ts                # contextBridge: window.api
    └── renderer/
        ├── index.html              # HTML entry point
        └── src/
            ├── main.tsx            # React entry point
            ├── App.tsx             # Корневой компонент приложения
            ├── assets/
            │   └── main.css        # Глобальные стили + Tailwind
            ├── components/
            │   ├── terminal/
            │   │   ├── Terminal.tsx     # React-обёртка для xterm.js
            │   │   └── use-terminal.ts # Хук: инициализация xterm, addons, IPC
            │   ├── layout/
            │   │   ├── TitleBar.tsx     # Кастомный titlebar (frameless)
            │   │   ├── TabBar.tsx       # Панель табов
            │   │   ├── Tab.tsx          # Отдельный таб
            │   │   ├── SplitPane.tsx    # Рекурсивный рендеринг дерева сплитов
            │   │   └── WorkspaceBar.tsx # Панель рабочих пространств
            │   └── file-manager/
            │       ├── FileManager.tsx  # Боковая панель файлового менеджера
            │       ├── FileTree.tsx     # Виртуализированное дерево файлов
            │       └── FileItem.tsx     # Строка файла/папки
            ├── stores/
            │   ├── tab-store.ts         # Zustand: табы + layout деревья
            │   ├── terminal-store.ts    # Zustand: реестр терминальных сессий
            │   ├── file-manager-store.ts# Zustand: файловый менеджер
            │   └── workspace-store.ts   # Zustand: рабочие пространства
            ├── lib/
            │   └── layout-tree.ts       # Чистые функции для layout-дерева
            ├── hooks/                   # (зарезервировано для общих хуков)
            └── types/
                └── electron.d.ts        # Типы window.api
```

## Описание ключевых директорий

### `src/shared/`
Код, который импортируется из обоих процессов (main и renderer). Содержит константы IPC-каналов, которые должны совпадать на обеих сторонах.

### `src/main/`
Код, выполняемый в Node.js контексте Electron. Имеет доступ к `node-pty`, `fs`, `chokidar` и другим нативным модулям.

### `src/preload/`
Скрипт, выполняемый в изолированном контексте перед загрузкой renderer. Единственный мост между Node.js API и браузерным окружением.

### `src/renderer/`
Стандартное React-приложение, работающее в Chromium. Не имеет прямого доступа к Node.js. Взаимодействует с main process исключительно через `window.api`.

## Конфигурация TypeScript

Проект использует **project references** — два подпроекта:

| Конфиг | Область | Особенности |
|--------|---------|-------------|
| `tsconfig.node.json` | main, preload, shared | `lib: ["ESNext"]`, нет DOM |
| `tsconfig.web.json` | renderer | `lib: ["ESNext", "DOM"]`, `jsx: "react-jsx"`, алиас `@/` |

## Конфигурация electron-vite

Три отдельных конфигурации в одном файле:

- **main** — `externalizeDepsPlugin()` + явный external для `node-pty`
- **preload** — `externalizeDepsPlugin()`
- **renderer** — `@vitejs/plugin-react` + `@tailwindcss/vite`, алиас `@` → `src/renderer/src`
