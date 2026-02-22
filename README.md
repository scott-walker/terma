<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=48&duration=3000&pause=1000&color=9ECE6A&center=true&vCenter=true&width=280&height=65&lines=TERMA">
    <img alt="Terma" src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=48&duration=3000&pause=1000&color=1A1B26&center=true&vCenter=true&width=280&height=65&lines=TERMA">
  </picture>
</p>

<p align="center">
  <b>Modern terminal emulator</b><br>
  <sub>Built with Electron &bull; React &bull; xterm.js</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-40.x-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-4.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind">
</p>

---

## Features

- **Split panes** — vertical & horizontal splits, unlimited nesting
- **6 pane types** — terminal, file manager, agent, markdown, image, system monitor — switch on the fly
- **Multiple tabs** — drag-reorder, color coding, close confirmation
- **Git integration** — branch info, checkout, create branches from UI
- **SSH file browsing** — connect to remote servers via SFTP, manage profiles
- **System monitor** — CPU, RAM, disk metrics + app self-monitoring gauges
- **4 built-in themes** — Tokyo Night, Dracula, Catppuccin Mocha, One Dark
- **Session persistence** — tabs, panes, working directories survive restart
- **File manager** — virtual tree, live updates, trash & restore, SSH remote browsing
- **Voice input** — Whisper transcription via OpenAI API
- **Translation** — text translation via OpenAI API
- **Agent profiles** — configurable AI agent commands (Claude, Aider, etc.)
- **Settings panel** — font, theme, cursor style, file associations, SSH/agent profiles, zoom
- **Frameless window** — custom titlebar, close confirmation dialog

## Quick Start

```bash
git clone <repo-url> terma
cd terma
npm install
npm run dev
```

> Requires Node.js >= 18, C++ compiler, Python 3.x (for node-pty native build)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | New tab |
| `Ctrl+Shift+W` | Close tab |
| `Ctrl+Shift+D` | Split vertical |
| `Ctrl+Shift+E` | Split horizontal |
| `Ctrl+Shift+B` | Open file manager |
| `Ctrl+Shift+A` | Toggle agent mode |
| `Ctrl+Shift+,` | Settings |
| `Ctrl+=` / `Ctrl+-` | Zoom in/out |
| `Ctrl+/` | Toggle voice recording |
| `Ctrl+W` / `Ctrl+Q` | Close window |
| `Ctrl+Shift+1-9` | Switch tabs |

## Documentation

Full documentation is available in the [wiki](docs/wiki/index.md):

| Section | Description |
|---------|-------------|
| [Getting started](docs/wiki/getting-started.md) | Installation, first run |
| [Architecture](docs/wiki/architecture.md) | Electron processes, data flow |
| [Project structure](docs/wiki/project-structure.md) | File tree, modules |
| [Main process](docs/wiki/main-process.md) | PTY, file system, services |
| [IPC API](docs/wiki/ipc-api.md) | All channels, typed API |
| [Renderer](docs/wiki/renderer-process.md) | React components, stores |
| [Layout system](docs/wiki/layout-system.md) | Pane tree, splits, types |
| [File manager](docs/wiki/file-manager.md) | Virtual tree, watchers |
| [Theming](docs/wiki/theming.md) | Color themes, design tokens |
| [Shortcuts](docs/wiki/keyboard-shortcuts.md) | All keybindings |
| [Contributing](docs/wiki/contributing.md) | Dev guide, debugging |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Electron 40 |
| UI | React 19, Tailwind CSS 4 |
| Terminal | xterm.js 5, node-pty 1 |
| State | Zustand 5 |
| Persistence | electron-store 11 |
| Panels | react-resizable-panels 4 |
| SSH | ssh2 |
| System info | systeminformation |
| Markdown | react-markdown |
| Icons | lucide-react |
| Animations | framer-motion |

## License

MIT
