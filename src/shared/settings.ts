export interface TerminalSettings {
  activeThemeId: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  cursorBlink: boolean
  cursorStyle: 'bar' | 'block' | 'underline'
  scrollback: number
  zoomLevel: number
}

export const DEFAULT_SETTINGS: TerminalSettings = {
  activeThemeId: 'tokyo-night',
  fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Menlo, monospace",
  fontSize: 14,
  lineHeight: 1.2,
  cursorBlink: true,
  cursorStyle: 'bar',
  scrollback: 10000,
  zoomLevel: 0
}

export function getEffectiveFontSize(settings: TerminalSettings): number {
  return settings.fontSize + settings.zoomLevel * 2
}
