import type { ITheme } from '@xterm/xterm'

export interface ThemePreset {
  id: string
  name: string
  colors: ITheme
}

export const PRESET_THEMES: ThemePreset[] = [
  {
    id: 'terma',
    name: 'Terma',
    colors: {
      background: '#0F1726',
      foreground: '#FFFFFF',
      cursor: '#5CBF5C',
      cursorAccent: '#0F1726',
      selectionBackground: '#1E3A4F',
      selectionForeground: '#FFFFFF',
      black: '#0A1018',
      red: '#F45C6B',
      green: '#5CBF5C',
      yellow: '#E8C467',
      blue: '#5B9CF5',
      magenta: '#C17ADB',
      cyan: '#5CC5D4',
      white: '#FFFFFF',
      brightBlack: '#3A4D62',
      brightRed: '#FF7A87',
      brightGreen: '#C3F19C',
      brightYellow: '#F5D98A',
      brightBlue: '#7DB4FF',
      brightMagenta: '#D8A0F0',
      brightCyan: '#7EDAE6',
      brightWhite: '#FFFFFF'
    }
  },
  {
    id: 'dracula',
    name: 'Dracula',
    colors: {
      background: '#282a36',
      foreground: '#f8f8f2',
      cursor: '#f8f8f2',
      cursorAccent: '#282a36',
      selectionBackground: '#44475a',
      selectionForeground: '#f8f8f2',
      black: '#21222c',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#f8f8f2',
      brightBlack: '#6272a4',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#d6acff',
      brightMagenta: '#ff92df',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff'
    }
  },
  {
    id: 'one-dark',
    name: 'One Dark',
    colors: {
      background: '#282c34',
      foreground: '#abb2bf',
      cursor: '#528bff',
      cursorAccent: '#282c34',
      selectionBackground: '#3e4451',
      selectionForeground: '#abb2bf',
      black: '#1e2127',
      red: '#e06c75',
      green: '#98c379',
      yellow: '#d19a66',
      blue: '#61afef',
      magenta: '#c678dd',
      cyan: '#56b6c2',
      white: '#abb2bf',
      brightBlack: '#5c6370',
      brightRed: '#e06c75',
      brightGreen: '#98c379',
      brightYellow: '#d19a66',
      brightBlue: '#61afef',
      brightMagenta: '#c678dd',
      brightCyan: '#56b6c2',
      brightWhite: '#ffffff'
    }
  }
]
