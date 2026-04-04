import { net, BrowserWindow } from 'electron'
import { nanoid } from 'nanoid'
import { TRANSLATE_CHANNELS, TTS_CHANNELS } from '../../shared/channels'
import { SettingsService } from '../settings/settings-service'
import { logger } from '../services/logger-service'
import { typedHandle } from './handlers'
import { elevenlabs } from '../tts/elevenlabs'

export function registerTranslateHandlers(): void {
  typedHandle(TRANSLATE_CHANNELS.TRANSLATE, async (_event, text: string): Promise<string> => {
    const { openaiApiKey } = SettingsService.getAll()
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not configured')
    }

    logger.info('translate', 'Translation started')

    const res = await net.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a translator. If the text is in Russian, translate to English. If the text is in any other language, translate to Russian. Return only the translation, no explanations.'
          },
          { role: 'user', content: text }
        ],
        temperature: 0.3
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`OpenAI API error ${res.status}: ${errText}`)
    }

    const data = (await res.json()) as { choices: Array<{ message: { content: string } }> }
    const translated = data.choices[0]?.message?.content?.trim() ?? ''
    logger.info('translate', 'Translation complete')
    return translated
  })

  typedHandle(TRANSLATE_CHANNELS.DEFINE, async (_event, text: string, rephrase: boolean): Promise<string> => {
    const { openaiApiKey } = SettingsService.getAll()
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not configured')
    }

    logger.info('translate', `Define started (rephrase=${rephrase})`)

    const res = await net.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: rephrase
              ? 'You previously explained this term but the user did not understand. Rephrase the explanation in simpler, more everyday language. Use analogies if helpful. Keep it short (1-3 sentences). Always reply in Russian.'
              : 'You are a concise dictionary/explainer. The user selected a word, phrase, or piece of text and wants to understand what it means. Give a clear, simple definition or explanation in 1-3 sentences. If it is a technical term, explain it in plain language. Always reply in Russian.'
          },
          { role: 'user', content: text }
        ],
        temperature: rephrase ? 0.8 : 0.3
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`OpenAI API error ${res.status}: ${errText}`)
    }

    const data = (await res.json()) as { choices: Array<{ message: { content: string } }> }
    const definition = data.choices[0]?.message?.content?.trim() ?? ''
    logger.info('translate', 'Define complete')
    return definition
  })

  typedHandle(TRANSLATE_CHANNELS.SUMMARIZE, async (event, text: string) => {
    const { openaiApiKey, elevenlabsApiKey, httpProxy } = SettingsService.getAll()
    if (!openaiApiKey) throw new Error('OpenAI API key is not configured')
    if (!elevenlabsApiKey) throw new Error('ElevenLabs API key is not configured')

    logger.info('translate', 'Summarize started')

    // Step 1: Generate summary via LLM
    const res = await net.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Ты делаешь краткое саммари текста на русском языке. Пиши лаконично, 2-4 предложения. Если текст на другом языке — переведи и резюмируй на русском. Только саммари, без вступлений.'
          },
          { role: 'user', content: text }
        ],
        temperature: 0.3
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`OpenAI API error ${res.status}: ${errText}`)
    }

    const data = (await res.json()) as { choices: Array<{ message: { content: string } }> }
    const summary = data.choices[0]?.message?.content?.trim() ?? ''
    logger.info('translate', `Summarize complete: ${summary.length} chars`)

    // Step 2: Stream TTS of the summary
    const streamId = nanoid()
    const win = BrowserWindow.fromWebContents(event.sender)

    ;(async () => {
      try {
        for await (const chunk of elevenlabs.speak(summary, elevenlabsApiKey, httpProxy || undefined)) {
          if (win?.isDestroyed()) break
          win?.webContents.send(TTS_CHANNELS.STREAM, streamId, {
            type: 'chunk' as const,
            data: Buffer.from(chunk).toString('base64')
          })
        }
        if (!win?.isDestroyed()) {
          win?.webContents.send(TTS_CHANNELS.STREAM, streamId, { type: 'done' as const })
        }
        logger.info('translate', `Summarize TTS stream ${streamId} complete`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'TTS stream failed'
        logger.error('translate', `Summarize TTS stream ${streamId} error`, message)
        if (!win?.isDestroyed()) {
          win?.webContents.send(TTS_CHANNELS.STREAM, streamId, { type: 'error' as const, message })
        }
      }
    })()

    return { summary, streamId, sampleRate: elevenlabs.sampleRate }
  })
}
