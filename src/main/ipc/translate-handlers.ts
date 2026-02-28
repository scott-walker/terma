import { net } from 'electron'
import { TRANSLATE_CHANNELS } from '../../shared/channels'
import { SettingsService } from '../settings/settings-service'
import { logger } from '../services/logger-service'
import { typedHandle } from './handlers'

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
}
