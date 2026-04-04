import { useState, useRef, useCallback, useEffect, memo } from 'react'
import { Mic, Square, X, Loader2 } from 'lucide-react'
import type { PaneType } from '@/lib/layout-tree'
import { getPtyId, focus } from '@/lib/terminal-manager'
import { useTabStore } from '@/stores/tab-store'
import { useToastStore } from '@/stores/toast-store'

interface WhisperButtonProps {
  paneId: string
  paneType: PaneType
  isSshMode: boolean
  disabled: boolean
}

function getTerminalKey(paneId: string, paneType: PaneType): string {
  return paneType === 'agent' ? paneId + ':agent' : paneId
}

export const WhisperButton = memo(function WhisperButton({ paneId, paneType, isSshMode, disabled }: WhisperButtonProps): JSX.Element {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const cancelledRef = useRef(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const startRecording = useCallback(async () => {
    try {
      cancelledRef.current = false
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null

        if (cancelledRef.current) return

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (blob.size === 0) return

        setTranscribing(true)
        try {
          const buffer = await blob.arrayBuffer()
          const text = await window.api.whisper.transcribe(buffer)
          if (text) {
            const tmKey = isSshMode
              ? paneId + ':ssh'
              : getTerminalKey(paneId, paneType)
            const ptyId = getPtyId(tmKey)
            if (ptyId) {
              window.api.pty.write(ptyId, text)
              focus(tmKey)
            }
          }
        } catch (err) {
          useToastStore.getState().addToast('error', err instanceof Error ? err.message : 'Transcription failed')
        } finally {
          setTranscribing(false)
        }
      }

      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      useToastStore.getState().addToast('error', 'Microphone access denied')
    }
  }, [paneId, paneType, isSshMode])

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }
    recorderRef.current = null
    setRecording(false)
  }, [])

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true
    const recorder = recorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }
    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    recorderRef.current = null
    setRecording(false)
  }, [])

  // Global hotkey: toggle recording for the active pane
  useEffect(() => {
    const handler = (): void => {
      const state = useTabStore.getState()
      const tab = state.tabs[state.activeTabId ?? '']
      if (!tab || tab.activePaneId !== paneId) return
      if (disabled || transcribing) return
      if (recording) {
        stopRecording()
      } else {
        startRecording()
      }
    }
    window.addEventListener('terma:toggle-recording', handler)
    return () => window.removeEventListener('terma:toggle-recording', handler)
  }, [paneId, disabled, transcribing, recording, startRecording, stopRecording])

  // Enter to confirm, Escape to cancel while recording
  useEffect(() => {
    if (!recording) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        stopRecording()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        cancelRecording()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [recording, stopRecording, cancelRecording])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          if (disabled || transcribing) return
          if (recording) {
            stopRecording()
          } else {
            startRecording()
          }
        }}
        title={disabled ? 'Set OpenAI API key in Settings' : recording ? 'Stop recording' : transcribing ? 'Transcribing...' : 'Start recording'}
        disabled={disabled || transcribing}
        className={`rounded-sm border-none bg-transparent px-1.5 py-1 leading-none transition-colors ${
          disabled
            ? 'cursor-not-allowed text-fg-muted opacity-30'
            : recording
              ? 'animate-pulse cursor-pointer text-danger'
              : transcribing
                ? 'text-warning'
                : 'cursor-pointer text-fg-muted hover:text-fg'
        }`}
      >
        {recording ? <Square size={16} strokeWidth={1.8} fill="currentColor" /> : transcribing ? <Loader2 size={18} strokeWidth={1.8} className="animate-spin" /> : <Mic size={18} strokeWidth={1.8} />}
      </button>

      {recording && (
        <div className="absolute right-0 top-full z-50 mt-1 flex items-center gap-2 rounded-lg border border-border bg-popup-bg px-3 py-2 shadow-xl">
          <span className="whitespace-nowrap text-xs text-fg-muted">Recording…</span>
          <span className="whitespace-nowrap text-xs text-fg-muted/50">Enter — send</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              cancelRecording()
            }}
            className="flex cursor-pointer items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-xs text-danger hover:bg-surface-hover"
          >
            <X size={12} strokeWidth={2} />
            Esc
          </button>
        </div>
      )}
    </div>
  )
})
