# Terma — Вики

Terma — современный эмулятор терминала, построенный на Electron, React и xterm.js. Вдохновлён Warp и Wave Terminal. Ключевые возможности: сплит-панели, табы, 6 типов панелей (терминал / файловый менеджер / агент / markdown / изображения / системный монитор), Git-интеграция, SSH-подключения, голосовой ввод через Whisper, перевод текста, self-monitoring, персистентные сессии.

---

## Содержание

### Начало работы
- [Быстрый старт](getting-started.md) — установка, запуск, первые шаги

### Архитектура
- [Обзор архитектуры](architecture.md) — процессы Electron, потоки данных, принципы
- [Структура проекта](project-structure.md) — дерево файлов и назначение каждого модуля

### Основные системы
- [Main process](main-process.md) — PTY-менеджер, файловая система, сервисы, управление окном
- [Preload и IPC API](ipc-api.md) — каналы коммуникации, типизированный API
- [Renderer process](renderer-process.md) — React-компоненты, Zustand-хранилища

### Функциональность
- [Система layout](layout-system.md) — дерево панелей, типы панелей, сплиты, ресайз
- [Файловый менеджер](file-manager.md) — дерево файлов, watcher, виртуализация
- [Горячие клавиши](keyboard-shortcuts.md) — все сочетания клавиш

### Внешний вид
- [Тема и стилизация](theming.md) — цветовые темы, Tailwind CSS, дизайн-токены

### Разработка
- [Руководство разработчика](contributing.md) — архитектурные решения, добавление фич, отладка

---

## Технологический стек

| Слой | Технология | Версия |
|------|-----------|--------|
| Runtime | Electron | 40.x |
| Сборка | electron-vite + Vite | 5.x / 7.x |
| UI фреймворк | React | 19.x |
| Язык | TypeScript | 5.x |
| Стили | Tailwind CSS | 4.x |
| Терминал | xterm.js | 5.x |
| PTY | node-pty | 1.x |
| Состояние | Zustand | 5.x |
| Сплит-панели | react-resizable-panels | 4.x |
| Виртуализация | @tanstack/react-virtual | 3.x |
| Файловый watcher | chokidar | 5.x |
| Персистентность | electron-store | 11.x |
| Анимации | framer-motion | 12.x |
| Иконки | lucide-react | 0.575.x |
| Immutable updates | immer | 11.x |
| ID генерация | nanoid | 5.x |
| SSH-клиент | ssh2 | 1.17.x |
| Метрики системы | systeminformation | 5.31.x |
| Markdown | react-markdown | 10.x |
