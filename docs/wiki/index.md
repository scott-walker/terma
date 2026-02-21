# Terma — Вики

Terma — современный эмулятор терминала, построенный на Electron, React и xterm.js. Вдохновлён Warp и Wave Terminal, но без встроенного AI. Ключевые возможности: сплит-панели, табы, рабочие пространства, файловый менеджер.

---

## Содержание

### Начало работы
- [Быстрый старт](getting-started.md) — установка, запуск, первые шаги

### Архитектура
- [Обзор архитектуры](architecture.md) — процессы Electron, потоки данных, принципы
- [Структура проекта](project-structure.md) — дерево файлов и назначение каждого модуля

### Основные системы
- [Main process](main-process.md) — PTY-менеджер, файловая система, управление окном
- [Preload и IPC API](ipc-api.md) — каналы коммуникации, типизированный API
- [Renderer process](renderer-process.md) — React-компоненты, Zustand-хранилища

### Функциональность
- [Система layout](layout-system.md) — дерево панелей, сплиты, ресайз
- [Файловый менеджер](file-manager.md) — дерево файлов, watcher, виртуализация
- [Горячие клавиши](keyboard-shortcuts.md) — все сочетания клавиш

### Внешний вид
- [Тема и стилизация](theming.md) — цветовая схема, Tailwind CSS, кастомный titlebar

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
