import type { SshProfile } from './ssh-types'
import type { AgentProfile } from './agent-types'

export interface FileAssociation {
  pattern: string
  command: string
}

export interface TerminalSettings {
  activeThemeId: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  cursorBlink: boolean
  cursorStyle: 'bar' | 'block' | 'underline'
  scrollback: number
  zoomLevel: number
  fileAssociations: FileAssociation[]
  agentCommand: string
  openaiApiKey: string
  elevenlabsApiKey: string
  whisperLanguage: 'ru' | 'en'
  httpProxy: string
  idePath: string
  sshProfiles: SshProfile[]
  agentProfiles: AgentProfile[]
}

export const DEFAULT_SETTINGS: TerminalSettings = {
  activeThemeId: 'terma',
  fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Menlo, monospace",
  fontSize: 14,
  lineHeight: 1.2,
  cursorBlink: true,
  cursorStyle: 'bar',
  scrollback: 10000,
  zoomLevel: 0,
  fileAssociations: [],
  agentCommand: 'claude',
  openaiApiKey: '',
  elevenlabsApiKey: '',
  whisperLanguage: 'ru',
  httpProxy: '',
  idePath: '',
  sshProfiles: [],
  agentProfiles: [{ id: 'default-claude', name: 'Claude', command: 'claude' }]
}

export function getEffectiveFontSize(settings: TerminalSettings): number {
  return settings.fontSize + settings.zoomLevel * 2
}

export function matchesGlob(filename: string, pattern: string): boolean {
  const regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${regex}$`, 'i').test(filename)
}
