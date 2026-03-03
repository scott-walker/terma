import { useEffect, useState, useCallback } from 'react'
import { X, Copy, StopCircle, Users, Wifi } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useShareStore } from '@/stores/share-store'
import { useToastStore } from '@/stores/toast-store'
import type { ShareSessionInfo } from '@shared/share-types'

interface ShareModalProps {
  paneId: string
  ptyId: string
  onClose: () => void
}

export function ShareModal({ paneId, ptyId, onClose }: ShareModalProps): JSX.Element {
  const startShare = useShareStore((s) => s.startShare)
  const stopShare = useShareStore((s) => s.stopShare)
  const getSession = useShareStore((s) => s.getSession)
  const refreshStatus = useShareStore((s) => s.refreshStatus)
  const addToast = useToastStore((s) => s.addToast)

  const [info, setInfo] = useState<ShareSessionInfo | null>(() => getSession(paneId))
  const [starting, setStarting] = useState(false)

  // Start sharing on mount if not yet active
  useEffect(() => {
    if (info) return
    setStarting(true)
    startShare(ptyId, paneId)
      .then((newInfo) => setInfo(newInfo))
      .catch((err) => {
        addToast('error', `Share failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        onClose()
      })
      .finally(() => setStarting(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll client count every 3s
  useEffect(() => {
    const interval = setInterval(async () => {
      await refreshStatus(paneId)
      const updated = getSession(paneId)
      if (updated) setInfo(updated)
    }, 3000)
    return () => clearInterval(interval)
  }, [paneId, refreshStatus, getSession])

  const handleCopy = useCallback(async () => {
    if (!info) return
    await navigator.clipboard.writeText(info.url)
    addToast('success', 'URL copied to clipboard')
  }, [info, addToast])

  const handleStop = useCallback(async () => {
    await stopShare(paneId)
    addToast('info', 'Terminal sharing stopped')
    onClose()
  }, [paneId, stopShare, addToast, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="flex w-[400px] flex-col rounded-lg bg-popup-bg shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Wifi size={18} className="text-accent" />
            <h2 className="text-sm font-semibold text-fg">Share Terminal</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col items-center gap-5 px-5 py-6">
          {starting || !info ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="text-sm text-fg-muted">Starting share server...</p>
            </div>
          ) : (
            <>
              {/* QR Code */}
              <div className="rounded-xl bg-white p-4">
                <QRCodeSVG value={info.url} size={200} />
              </div>

              {/* URL */}
              <div className="flex w-full items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
                <span className="flex-1 truncate text-xs text-fg-muted font-mono">{info.url}</span>
                <button
                  onClick={handleCopy}
                  className="shrink-0 rounded p-1 text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
                  title="Copy URL"
                >
                  <Copy size={14} />
                </button>
              </div>

              {/* Client count */}
              <div className="flex items-center gap-2 text-sm text-fg-muted">
                <Users size={14} className={info.clientCount > 0 ? 'text-accent' : ''} />
                <span>
                  {info.clientCount === 0
                    ? 'No active connections'
                    : info.clientCount === 1
                      ? '1 active connection'
                      : `${info.clientCount} active connections`}
                </span>
              </div>

              <p className="text-center text-xs text-fg-muted">
                Scan the QR code to open the terminal in a mobile browser.
                Closing this modal keeps sharing active.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        {info && !starting && (
          <div className="flex justify-end border-t border-border px-5 py-3">
            <button
              onClick={handleStop}
              className="flex items-center gap-2 rounded-md bg-danger px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80"
            >
              <StopCircle size={15} />
              Stop sharing
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
