import { net } from 'electron'
import { WHISPER_CHANNELS } from '../../shared/channels'
import { SettingsService } from '../settings/settings-service'
import { resolveTranscriptionEndpoint } from '../../shared/settings'
import { logger } from '../services/logger-service'
import { typedHandle } from './handlers'

interface ListModelsArgs {
  baseUrl: string
  apiKey: string
}

function buildHeaders(apiKey: string): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
}

export function registerWhisperHandlers(): void {
  typedHandle(WHISPER_CHANNELS.TRANSCRIBE, async (_event, audioBytes: ArrayBuffer): Promise<string> => {
    const settings = SettingsService.getAll()
    const endpoint = resolveTranscriptionEndpoint(settings)
    if (!endpoint) {
      throw new Error(
        settings.whisperProvider === 'custom'
          ? 'Custom transcription base URL is not configured'
          : 'OpenAI API key is not configured'
      )
    }

    logger.info('whisper', `Transcription started (${settings.whisperProvider}, model=${endpoint.model})`)

    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
    const filename = 'audio.webm'

    const parts: Buffer[] = []

    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: audio/webm\r\n\r\n`
      )
    )
    parts.push(Buffer.from(audioBytes))
    parts.push(Buffer.from('\r\n'))

    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${endpoint.model}\r\n`
      )
    )

    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\ntext\r\n`
      )
    )

    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${settings.whisperLanguage || 'ru'}\r\n`
      )
    )

    parts.push(Buffer.from(`--${boundary}--\r\n`))

    const body = Buffer.concat(parts)

    const res = await net.fetch(`${endpoint.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        ...buildHeaders(endpoint.apiKey),
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Transcription error ${res.status}: ${errText}`)
    }

    const text = await res.text()
    logger.info('whisper', 'Transcription complete')
    return text.trim()
  })

  typedHandle(WHISPER_CHANNELS.LIST_MODELS, async (_event, args: ListModelsArgs): Promise<string[]> => {
    const baseUrl = args.baseUrl.trim().replace(/\/+$/, '')
    if (!baseUrl) throw new Error('Base URL is required')

    const res = await net.fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: buildHeaders(args.apiKey)
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`List models error ${res.status}: ${errText}`)
    }

    const json = (await res.json()) as { data?: { id: string }[] }
    const ids = (json.data ?? []).map((m) => m.id).filter(Boolean)
    return ids
  })
}
