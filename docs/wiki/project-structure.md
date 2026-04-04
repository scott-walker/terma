# Структура проекта

```
terma/
├── package.json                    # Зависимости, скрипты
├── tsconfig.json                   # Корневой TS конфиг (project references)
├── tsconfig.node.json              # TS конфиг для main + preload
├── tsconfig.web.json               # TS конфиг для renderer
├── electron.vite.config.ts         # Конфигурация electron-vite
├── electron-builder.yml            # Конфигурация electron-builder (сборка дистрибутива)
├── docs/
│   └── wiki/                       # Документация (эта вики)
├── out/                            # Собранные файлы (gitignore)
├── resources/                      # Статические ресурсы (иконки и т.д.)
├── scripts/
│   ├── install.sh                  # Скрипт установки
│   ├── release.sh                  # Скрипт релиза
│   └── after-install.sh            # Post-install скрипт (DEB/RPM)
└── src/
    ├── shared/                     # Код, общий для main и renderer
    │   ├── channels.ts             # Константы IPC-каналов (15 групп)
    │   ├── ipc-types.ts            # Типизированный IPC-контракт (IpcInvokeMap, IpcSendMap, IpcEventMap)
    │   ├── types.ts                # Типы: LayoutNode, FileEntry, SessionState, SystemMetrics, SelfMetrics и др.
    │   ├── settings.ts             # Интерфейс TerminalSettings + значения по умолчанию
    │   ├── themes.ts               # Пресеты цветовых тем (Tokyo Night, Dracula и др.)
    │   ├── agent-types.ts          # Интерфейс AgentProfile
    │   ├── ssh-types.ts            # Интерфейс SshProfile
    │   └── path-utils.ts           # Утилиты для путей, isModKey (кроссплатформенный Ctrl/Cmd)
    ├── main/                       # Electron main process
    │   ├── index.ts                # Entry point: создание окна, регистрация IPC
    │   ├── pty/
    │   │   └── pty-manager.ts      # Менеджер PTY-сессий
    │   ├── file-system/
    │   │   ├── fs-service.ts       # Операции с файловой системой
    │   │   └── fs-watcher.ts       # Наблюдение за файлами (chokidar)
    │   ├── sessions/
    │   │   └── session-service.ts  # Персистентность сессий (electron-store)
    │   ├── settings/
    │   │   └── settings-service.ts # Персистентность настроек (electron-store)
    │   ├── services/
    │   │   ├── platform-service.ts # Платформо-зависимая логика (Linux/Mac/Win)
    │   │   ├── logger-service.ts   # In-memory логирование + IPC broadcast
    │   │   ├── git-service.ts      # Git-интеграция (child_process: git info, branches, checkout)
    │   │   └── system-monitor-service.ts # Метрики системы (systeminformation)
    │   ├── ssh/
    │   │   └── ssh-service.ts      # SSH-подключения через ssh2
    │   └── ipc/
    │       ├── handlers.ts         # Обработчики PTY + FS
    │       ├── session-handlers.ts # Обработчики сессий
    │       ├── settings-handlers.ts# Обработчики настроек
    │       ├── whisper-handlers.ts # Обработчики Whisper (голосовой ввод)
    │       ├── log-handlers.ts     # Обработчики логирования
    │       ├── ssh-handlers.ts     # Обработчики SSH (connect, disconnect, readDir, getHomeDir)
    │       ├── sysmon-handlers.ts  # Обработчики системного мониторинга + self-monitoring
    │       ├── translate-handlers.ts # Обработчики перевода текста (OpenAI API)
    │       └── tts-handlers.ts     # Обработчики TTS: потоковый синтез речи (ElevenLabs)
    ├── tts/
    │   ├── tts-provider.ts         # Интерфейс TtsProvider (speak: AsyncIterable<Uint8Array>)
    │   └── elevenlabs.ts           # Реализация TtsProvider через ElevenLabs API
    ├── preload/
    │   └── index.ts                # contextBridge: window.api (14 API-групп)
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
            │   │   ├── PaneContent.tsx  # Условный рендер: Terminal / FileManager / Agent / Markdown / Image / SystemMonitor
            │   │   ├── PaneWrapper.tsx  # Контейнер панели: бордюр, drag-drop swap, overlay
            │   │   ├── SplitPane.tsx    # Рекурсивный рендеринг дерева сплитов
            │   │   ├── StatusBar.tsx    # Статусная строка (PWD, SSH, агент, self-monitoring gauges, панели, логи)
            │   │   ├── ErrorBoundary.tsx# Перехватчик ошибок
            │   │   ├── GitInfo.tsx      # Git-информация в панели (репозиторий, ветка)
            │   │   ├── GitBranchDropdown.tsx # Dropdown для переключения/создания веток
            │   │   └── WhisperButton.tsx# Кнопка голосового ввода (Whisper)
            │   ├── file-manager/
            │   │   ├── FileManagerPane.tsx # Панель файлового менеджера
            │   │   ├── FileTree.tsx     # Виртуализированное дерево файлов
            │   │   ├── FileItem.tsx     # Строка файла/папки
            │   │   ├── FileTypeIcon.tsx # Иконки по расширению файла
            │   │   ├── FileSearchModal.tsx # Быстрый поиск файлов (Ctrl+P стиль)
            │   │   ├── SshDropdown.tsx  # Dropdown для выбора SSH-профиля
            │   │   └── SshProfilesModal.tsx # Модалка управления SSH-профилями
            │   ├── agent/
            │   │   ├── AgentDropdown.tsx # Dropdown для выбора агент-профиля
            │   │   └── AgentProfilesModal.tsx # Модалка управления агент-профилями
            │   ├── system-monitor/
            │   │   └── SystemMonitorPane.tsx # Панель системного монитора (CPU, RAM, диски)
            │   ├── markdown/
            │   │   └── MarkdownPane.tsx # Панель просмотра Markdown
            │   ├── image/
            │   │   └── ImagePane.tsx    # Панель просмотра изображений
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
            │       ├── TranslationSnippet.tsx # Сниппет для отображения переведённого текста
            │       ├── SpeechSnippet.tsx # Плеер TTS: потоковое воспроизведение синтезированной речи
            │       └── icons/          # Переиспользуемые иконки (lucide-react)
            ├── stores/
            │   ├── tab-store.ts         # Zustand: табы + layout деревья + сессии
            │   ├── settings-store.ts    # Zustand: настройки + тема + zoom
            │   ├── toast-store.ts       # Zustand: уведомления
            │   ├── file-manager-store.ts# Zustand: per-pane состояние файлового менеджера
            │   ├── agent-store.ts       # Zustand: per-pane привязка агент-профиля
            │   └── ssh-store.ts         # Zustand: per-pane SSH-подключения
            ├── lib/
            │   ├── layout-tree.ts       # Чистые функции для layout-дерева
            │   ├── pane-types.ts        # Конфигурации типов панелей (6 типов)
            │   └── terminal-manager.ts  # Реестр xterm.Terminal instances
            └── types/
                └── electron.d.ts        # Типы window.api (14 API-интерфейсов)
```

## Описание ключевых директорий

### `src/shared/`
Код, который импортируется из обоих процессов (main и renderer). Содержит константы IPC-каналов (15 групп), типизированный IPC-контракт (`ipc-types.ts`), типы данных (layout, файлы, сессии, метрики), настройки, пресеты тем, профили агентов и SSH.

### `src/main/`
Код, выполняемый в Node.js контексте Electron. Имеет доступ к `node-pty`, `fs`, `chokidar`, `electron-store`, `ssh2`, `systeminformation` и другим нативным модулям. IPC-обработчики разделены на 9 модулей по функциональности. Синтез речи реализован отдельным слоем `src/main/tts/` (провайдер + ElevenLabs-реализация).

### `src/preload/`
Скрипт, выполняемый в изолированном контексте перед загрузкой renderer. Единственный мост между Node.js API и браузерным окружением. Экспортирует 15 API-групп через `contextBridge`. Реализует per-PTY и per-stream (TTS) dispatch для оптимальной маршрутизации данных.

### `src/renderer/`
React-приложение, работающее в Chromium. Не имеет прямого доступа к Node.js. Взаимодействует с main process исключительно через `window.api`. Управление xterm-инстансами централизовано в `terminal-manager.ts`. Содержит 12 директорий компонентов и 6 Zustand stores. Аудиовоспроизведение TTS выполняется через Web Audio API (`AudioContext`) в компоненте `SpeechSnippet`.

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
