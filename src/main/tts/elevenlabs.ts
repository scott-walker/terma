import { fetch as undiciFetch, ProxyAgent } from 'undici'
import { logger } from '../services/logger-service'
import type { TtsProvider } from './tts-provider'

const VOICE_ID = 'WTn2eCRCpoFAC50VD351' // Artem - Friendly & Professional

export const elevenlabs: TtsProvider = {
  sampleRate: 16000,

  async *speak(text, apiKey, proxyUrl?) {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=pcm_16000`
    logger.info('tts', `POST ${url} (${text.length} chars)${proxyUrl ? ` via proxy` : ''}`)

    const fetchOptions: Parameters<typeof undiciFetch>[1] = {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          stability: 1.0,
          similarity_boost: 1.0,
          speed: 1.0
        },
        language_code: 'ru'
      })
    }

    if (proxyUrl) {
      fetchOptions.dispatcher = new ProxyAgent(proxyUrl)
    }

    const res = await undiciFetch(url, fetchOptions)

    logger.info('tts', `Response ${res.status} content-type: ${res.headers.get('content-type')}`)

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`ElevenLabs API error ${res.status}: ${errText}`)
    }

    if (!res.body) {
      throw new Error('ElevenLabs returned empty body')
    }

    // PCM s16le = 2 bytes per sample. Network chunks may split a sample,
    // so we buffer a trailing odd byte and prepend it to the next chunk.
    let totalBytes = 0
    let leftover: Uint8Array | null = null

    for await (const chunk of res.body) {
      let bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk as ArrayBuffer)

      if (leftover) {
        const merged = new Uint8Array(leftover.byteLength + bytes.byteLength)
        merged.set(leftover)
        merged.set(bytes, leftover.byteLength)
        bytes = merged
        leftover = null
      }

      if (bytes.byteLength % 2 !== 0) {
        leftover = bytes.slice(-1)
        bytes = bytes.slice(0, -1)
      }

      if (bytes.byteLength > 0) {
        totalBytes += bytes.byteLength
        yield bytes
      }
    }

    logger.info('tts', `Stream complete: ${totalBytes} bytes`)
  }
}
