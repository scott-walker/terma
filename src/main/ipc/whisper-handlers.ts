import { ipcMain } from 'electron'
import { WHISPER_CHANNELS } from '../../shared/channels'
import { SettingsService } from '../settings/settings-service'
import { logger } from '../services/logger-service'
import { wrapHandler } from './handlers'

export function registerWhisperHandlers(): void {
  ipcMain.handle(
    WHISPER_CHANNELS.TRANSCRIBE,
    wrapHandler(WHISPER_CHANNELS.TRANSCRIBE, async (_event, audioBytes: ArrayBuffer): Promise<string> => {
      const { openaiApiKey, whisperLanguage } = SettingsService.getAll()
      if (!openaiApiKey) {
        throw new Error('OpenAI API key is not configured')
      }

      logger.info('whisper', 'Transcription started')
      const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
      const filename = 'audio.webm'

      // Build multipart/form-data body
      const parts: Buffer[] = []

      // file field
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: audio/webm\r\n\r\n`
        )
      )
      parts.push(Buffer.from(audioBytes))
      parts.push(Buffer.from('\r\n'))

      // model field
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`
        )
      )

      // response_format field
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\ntext\r\n`
        )
      )

      // language field
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${whisperLanguage || 'ru'}\r\n`
        )
      )

      parts.push(Buffer.from(`--${boundary}--\r\n`))

      const body = Buffer.concat(parts)

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Whisper API error ${res.status}: ${errText}`)
      }

      const text = await res.text()
      logger.info('whisper', 'Transcription complete')
      return text.trim()
    })
  )
}
