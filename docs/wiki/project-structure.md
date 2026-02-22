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
    │   ├── channels.ts             # Константы IPC-каналов
    │   ├── types.ts                # Типы: LayoutNode, FileEntry, SessionState и др.
    │   ├── settings.ts             # Интерфейс TerminalSettings + значения по умолчанию
    │   └── themes.ts               # Пресеты цветовых тем (Tokyo Night, Dracula и др.)
    ├── main/                       # Electron main process
    │   ├── index.ts                # Entry point: создание окна, регистрация IPC
    │   ├── pty/
    │   │   └── pty-manager.ts      # Менеджер PTY-сессий
    │   ├── file-system/
    │   │   ├── fs-service.ts       # Операции с файловой системой
    │   │   └── fs-watcher.ts       # Наблюдение за файлами (chokidar)
    │   ├── sessions/
    │   │   └── session-service.ts  # Персистентность сессий (electron-store)
    │   ├── services/
    │   │   ├── platform-service.ts # Платформо-зависимая логика (Linux/Mac/Win)
    │   │   └── logger-service.ts   # In-memory логирование + IPC broadcast
    │   └── ipc/
    │       ├── handlers.ts         # Обработчики PTY + FS
    │       ├── session-handlers.ts # Обработчики сессий
    │       ├── settings-handlers.ts# Обработчики настроек
    │       ├── whisper-handlers.ts # Обработчики Whisper (голосовой ввод)
    │       └── log-handlers.ts     # Обработчики логирования
    ├── preload/
    │   └── index.ts                # contextBridge: window.api
    └── renderer/
        ├── index.html              # HTML entry point
        └── src/
            ├── main.tsx            # React entry point
            ├── App.tsx             # Корневой компонент приложения
            ├── assets/
            │   └── main.css        # @theme токены + @layer base + Tailwind
            ├── components/
            │   ├── terminal/
            │   │   └── Terminal.tsx     # React-обёртка для xterm.js
            │   ├── layout/
            │   │   ├── TitleBar.tsx     # Кастомный titlebar (frameless)
            │   │   ├── TabBar.tsx       # Панель табов с drag-reorder
            │   │   ├── PaneHeader.tsx   # Заголовок панели (тип, split, микрофон, закрытие)
            │   │   ├── PaneContent.tsx  # Условный рендер: Terminal / FileManager / Agent
            │   │   ├── PaneWrapper.tsx  # Контейнер панели: бордюр, drag-drop swap, overlay
            │   │   ├── SplitPane.tsx    # Рекурсивный рендеринг дерева сплитов
            │   │   ├── StatusBar.tsx    # Статусная строка (PWD, панели, логи)
            │   │   └── ErrorBoundary.tsx# Перехватчик ошибок
            │   ├── file-manager/
            │   │   ├── FileManagerPane.tsx # Панель файлового менеджера
            │   │   ├── FileTree.tsx     # Виртуализированное дерево файлов
            │   │   ├── FileItem.tsx     # Строка файла/папки
            │   │   └── FileTypeIcon.tsx # Иконки по расширению файла
            │   ├── settings/
            │   │   ├── SettingsPanel.tsx # Боковая панель настроек
            │   │   └── ThemeCard.tsx    # Карточка темы для выбора
            │   └── ui/
            │       ├── Button.tsx       # Кнопка
            │       ├── IconButton.tsx   # Иконка-кнопка
            │       ├── Input.tsx        # Текстовое поле
            │       ├── Toggle.tsx       # Переключатель
            │       ├── SegmentedControl.tsx # Сегментированный контрол
            │       ├── Kbd.tsx          # Отображение сочетания клавиш
            │       ├── Section.tsx      # Секция с заголовком
            │       ├── Divider.tsx      # Разделитель
            │       ├── Toast.tsx        # Уведомления
            │       ├── ContextMenu.tsx  # Контекстное меню
            │       ├── TabItem.tsx      # Компонент отдельного таба
            │       ├── NumberStepper.tsx # Числовой степпер
            │       ├── ConfirmDialog.tsx# Диалог подтверждения
            │       ├── WindowControls.tsx # Кнопки управления окном
            │       └── icons/          # Переиспользуемые иконки (lucide-react)
            ├── stores/
            │   ├── tab-store.ts         # Zustand: табы + layout деревья + сессии
            │   ├── settings-store.ts    # Zustand: настройки + тема + zoom
            │   ├── toast-store.ts       # Zustand: уведомления
            │   └── file-manager-store.ts# Zustand: per-pane состояние файлового менеджера
            ├── lib/
            │   ├── layout-tree.ts       # Чистые функции для layout-дерева
            │   ├── pane-types.ts        # Конфигурации типов панелей
            │   └── terminal-manager.ts  # Реестр xterm.Terminal instances
            └── types/
                └── electron.d.ts        # Типы window.api
```

## Описание ключевых директорий

### `src/shared/`
Код, который импортируется из обоих процессов (main и renderer). Содержит константы IPC-каналов, типы данных (layout, файлы, сессии), настройки и пресеты тем.

### `src/main/`
Код, выполняемый в Node.js контексте Electron. Имеет доступ к `node-pty`, `fs`, `chokidar`, `electron-store` и другим нативным модулям. IPC-обработчики разделены на модули по функциональности.

### `src/preload/`
Скрипт, выполняемый в изолированном контексте перед загрузкой renderer. Единственный мост между Node.js API и браузерным окружением. Экспортирует 9 API-групп через `contextBridge`.

### `src/renderer/`
React-приложение, работающее в Chromium. Не имеет прямого доступа к Node.js. Взаимодействует с main process исключительно через `window.api`. Управление xterm-инстансами централизовано в `terminal-manager.ts`.

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
