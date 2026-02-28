export interface TtsProvider {
  readonly sampleRate: number
  speak(text: string, apiKey: string, proxyUrl?: string): AsyncIterable<Uint8Array>
}
