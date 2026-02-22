import { useState, useRef, useCallback } from 'react'
import { Columns2, Rows2, X, Mic, Square } from 'lucide-react'
import type { PaneType } from '@/lib/layout-tree'
import { PANE_TYPE_CONFIGS, PANE_ACTIVE_CLASSES } from '@/lib/pane-types'
import { useTabStore } from '@/stores/tab-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useToastStore } from '@/stores/toast-store'
import { getPtyId } from '@/lib/terminal-manager'
import { IconButton } from '@/components/ui/IconButton'

interface PaneHeaderProps {
  tabId: string
  paneId: string
  paneType: PaneType
}

const paneTypes = Object.keys(PANE_TYPE_CONFIGS) as PaneType[]

const MIME_TYPE = 'application/x-terma-pane'

function getTerminalKey(paneId: string, paneType: PaneType): string {
  return paneType === 'agent' ? paneId + ':agent' : paneId
}

export function PaneHeader({ tabId, paneId, paneType }: PaneHeaderProps): JSX.Element {
  const config = PANE_TYPE_CONFIGS[paneType] ?? PANE_TYPE_CONFIGS.terminal
  const Icon = config.icon
  const hasApiKey = useSettingsStore((s) => !!s.settings.openaiApiKey)
  const showMic = paneType === 'terminal' || paneType === 'agent'
  const micDisabled = !hasApiKey

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
            const tmKey = getTerminalKey(paneId, paneType)
            const ptyId = getPtyId(tmKey)
            if (ptyId) {
              window.api.pty.write(ptyId, text)
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
  }, [paneId, paneType])

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }
    recorderRef.current = null
    setRecording(false)
  }, [])

  return (
    <div
      className="flex shrink-0 cursor-grab items-center justify-between gap-2.5 border-b border-border bg-pane-header-bg px-3.5 py-2 active:cursor-grabbing"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(MIME_TYPE, JSON.stringify({ paneId, tabId }))
        e.dataTransfer.effectAllowed = 'move'
      }}
    >
      {/* Left: icon + type tabs */}
      <div className="flex items-center gap-2.5">
        <Icon size={16} className={`${PANE_ACTIVE_CLASSES.colorClass} opacity-90`} />

        {/* Type switcher — colored tabs */}
        <div className="flex gap-0.5">
          {paneTypes.map((pt) => {
            const ptConfig = PANE_TYPE_CONFIGS[pt]
            const isActive = pt === paneType
            return (
              <button
                key={pt}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isActive) useTabStore.getState().setPaneType(tabId, paneId, pt)
                }}
                className={`cursor-pointer rounded-sm border border-transparent bg-transparent px-2.5 py-0.5 text-xs transition-all ${
                  isActive
                    ? `${PANE_ACTIVE_CLASSES.bgActiveClass} ${PANE_ACTIVE_CLASSES.borderActiveClass} ${PANE_ACTIVE_CLASSES.colorClass}`
                    : 'text-fg-muted'
                }`}
              >
                {ptConfig.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: mic + split + close */}
      <div className="flex gap-1.5">
        {showMic && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (micDisabled || transcribing) return
              if (recording) {
                stopRecording()
              } else {
                startRecording()
              }
            }}
            title={micDisabled ? 'Set OpenAI API key in Settings' : recording ? 'Stop recording' : transcribing ? 'Transcribing...' : 'Start recording'}
            disabled={micDisabled || transcribing}
            className={`rounded-sm border-none bg-transparent px-1.5 py-1 leading-none transition-colors ${
              micDisabled
                ? 'cursor-not-allowed text-fg-muted opacity-30'
                : recording
                  ? 'animate-pulse cursor-pointer text-danger'
                  : transcribing
                    ? 'text-warning'
                    : 'cursor-pointer text-fg-muted hover:text-fg'
            }`}
          >
            {recording ? <Square size={14} strokeWidth={1.8} fill="currentColor" /> : <Mic size={16} strokeWidth={1.8} />}
          </button>
        )}
        <IconButton
          icon={Columns2}
          onClick={(e) => {
            e.stopPropagation()
            useTabStore.getState().splitPane(tabId, paneId, 'vertical')
          }}
          title="Split vertical"
        />
        <IconButton
          icon={Rows2}
          onClick={(e) => {
            e.stopPropagation()
            useTabStore.getState().splitPane(tabId, paneId, 'horizontal')
          }}
          title="Split horizontal"
        />
        <IconButton
          icon={X}
          onClick={(e) => {
            e.stopPropagation()
            useTabStore.getState().closePane(tabId, paneId)
          }}
          title="Close pane"
        />
      </div>
    </div>
  )
}
