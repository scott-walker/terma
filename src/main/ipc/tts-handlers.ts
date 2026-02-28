import { BrowserWindow } from 'electron'
import { nanoid } from 'nanoid'
import { TTS_CHANNELS } from '../../shared/channels'
import { SettingsService } from '../settings/settings-service'
import { logger } from '../services/logger-service'
import { typedHandle } from './handlers'
import { elevenlabs } from '../tts/elevenlabs'

const provider = elevenlabs

export function registerTtsHandlers(): void {
  typedHandle(TTS_CHANNELS.SPEAK, (event, text: string) => {
    const { elevenlabsApiKey, httpProxy } = SettingsService.getAll()
    if (!elevenlabsApiKey) {
      throw new Error('ElevenLabs API key is not configured')
    }

    const streamId = nanoid()
    const win = BrowserWindow.fromWebContents(event.sender)

    logger.info('tts', `Stream ${streamId} started`)

    // Fire-and-forget: stream chunks to renderer in the background
    ;(async () => {
      try {
        for await (const chunk of provider.speak(text, elevenlabsApiKey, httpProxy || undefined)) {
          if (win?.isDestroyed()) break
          win?.webContents.send(TTS_CHANNELS.STREAM, streamId, {
            type: 'chunk' as const,
            data: Buffer.from(chunk).toString('base64')
          })
        }
        if (!win?.isDestroyed()) {
          win?.webContents.send(TTS_CHANNELS.STREAM, streamId, { type: 'done' as const })
        }
        logger.info('tts', `Stream ${streamId} complete`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'TTS stream failed'
        logger.error('tts', `Stream ${streamId} error`, message)
        if (!win?.isDestroyed()) {
          win?.webContents.send(TTS_CHANNELS.STREAM, streamId, { type: 'error' as const, message })
        }
      }
    })()

    return { streamId, sampleRate: provider.sampleRate }
  })
}
