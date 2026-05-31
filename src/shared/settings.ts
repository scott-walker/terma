import type { SshProfile } from './ssh-types'
import type { AgentProfile } from './agent-types'

export interface FileAssociation {
  pattern: string
  command: string
}

export type WhisperProvider = 'openai' | 'custom'

export interface TerminalSettings {
  activeThemeId: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  cursorBlink: boolean
  cursorStyle: 'bar' | 'block' | 'underline'
  minimumContrastRatio: number
  scrollback: number
  zoomLevel: number
  zoomStep: number
  fileAssociations: FileAssociation[]
  agentCommand: string
  openaiApiKey: string
  elevenlabsApiKey: string
  whisperProvider: WhisperProvider
  whisperCustomBaseUrl: string
  whisperCustomApiKey: string
  whisperCustomModel: string
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
  minimumContrastRatio: 4.5,
  scrollback: 10000,
  zoomLevel: 100,
  zoomStep: 10,
  fileAssociations: [],
  agentCommand: 'claude',
  openaiApiKey: '',
  elevenlabsApiKey: '',
  whisperProvider: 'openai',
  whisperCustomBaseUrl: '',
  whisperCustomApiKey: '',
  whisperCustomModel: '',
  whisperLanguage: 'ru',
  httpProxy: '',
  idePath: '',
  sshProfiles: [],
  agentProfiles: [{ id: 'default-claude', name: 'Claude', command: 'claude' }]
}

export interface TranscriptionEndpoint {
  baseUrl: string
  apiKey: string
  model: string
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

export function resolveTranscriptionEndpoint(settings: TerminalSettings): TranscriptionEndpoint | null {
  if (settings.whisperProvider === 'custom') {
    const baseUrl = normalizeBaseUrl(settings.whisperCustomBaseUrl)
    if (!baseUrl) return null
    return {
      baseUrl,
      apiKey: settings.whisperCustomApiKey,
      model: settings.whisperCustomModel || 'whisper-1'
    }
  }
  if (!settings.openaiApiKey) return null
  return {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: settings.openaiApiKey,
    model: 'whisper-1'
  }
}

export function isTranscriptionConfigured(settings: TerminalSettings): boolean {
  return resolveTranscriptionEndpoint(settings) !== null
}

export function matchesGlob(filename: string, pattern: string): boolean {
  const regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${regex}$`, 'i').test(filename)
}
