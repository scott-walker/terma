import { useState, useRef, useCallback, useEffect, memo } from 'react'
import { Mic, Square } from 'lucide-react'
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

  const startRecording = useCallback(async () => {
    try {
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

  return (
    <button
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
      {recording ? <Square size={16} strokeWidth={1.8} fill="currentColor" /> : <Mic size={18} strokeWidth={1.8} />}
    </button>
  )
})
